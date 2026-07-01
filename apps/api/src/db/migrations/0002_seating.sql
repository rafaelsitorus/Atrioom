-- ============================================================================
-- 0002_seating.sql — EPIC02 foundation
-- Tables: tables (meja), seats (kursi), seat_assignments, seating_audit
-- ============================================================================

-- ─── tables (meja fisik di venue) ──────────────────────────────────────────
create table if not exists public.tables (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  label           text not null check (char_length(label) between 1 and 50),
  capacity        integer not null check (capacity between 1 and 50),
  pos_x           double precision not null default 0,    -- anchor di canvas 2D
  pos_y           double precision not null default 0,
  shape           text not null default 'ROUND'
                  check (shape in ('ROUND','RECTANGULAR','LONG')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  row_version     bigint not null default 1,
  deleted_at      timestamptz,
  unique (event_id, label)
);
create index if not exists idx_tables_event on public.tables (event_id) where deleted_at is null;

drop trigger if exists trg_tables_bump on public.tables;
create trigger trg_tables_bump
  before update on public.tables
  for each row execute function public.fn_bump_row_version();

-- ─── seats (kursi individual di bawah meja) ───────────────────────────────
create table if not exists public.seats (
  id              uuid primary key default gen_random_uuid(),
  table_id        uuid not null references public.tables(id) on delete cascade,
  seat_label      text not null,                          -- "T1-A", "T1-B", ...
  pos_x           double precision not null default 0,    -- offset dari table anchor
  pos_y           double precision not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  row_version     bigint not null default 1,
  deleted_at      timestamptz,
  unique (table_id, seat_label)
);
create index if not exists idx_seats_table on public.seats (table_id) where deleted_at is null;

drop trigger if exists trg_seats_bump on public.seats;
create trigger trg_seats_bump
  before update on public.seats
  for each row execute function public.fn_bump_row_version();

-- ─── seat_assignments (guest ↔ seat) ───────────────────────────────────────
-- 1 kursi = max 1 tamu. Enforced oleh UNIQUE(seat_id) + check seat active.
create table if not exists public.seat_assignments (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  seat_id         uuid not null references public.seats(id) on delete cascade,
  guest_id        uuid not null references public.guests(id) on delete cascade,
  assigned_by     uuid,                                   -- auth.users.id
  assigned_at     timestamptz not null default now(),
  row_version     bigint not null default 1,
  -- Hanya 1 assignment aktif per seat (deleted_at = NULL)
  deleted_at      timestamptz
);

-- Partial unique index: 1 assignment aktif per seat
create unique index if not exists uq_seat_active_assignment
  on public.seat_assignments (seat_id)
  where deleted_at is null;

-- Partial unique index: 1 assignment aktif per guest (satu tamu = satu kursi)
create unique index if not exists uq_guest_active_assignment
  on public.seat_assignments (guest_id)
  where deleted_at is null;

create index if not exists idx_assignments_event on public.seat_assignments (event_id) where deleted_at is null;

drop trigger if exists trg_assignments_bump on public.seat_assignments;
create trigger trg_assignments_bump
  before update on public.seat_assignments
  for each row execute function public.fn_bump_row_version();

-- ─── seating_audit (audit trail untuk undo) ────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'seating_action') then
    create type public.seating_action as enum ('ASSIGN', 'UNASSIGN', 'MOVE');
  end if;
end $$;

create table if not exists public.seating_audit (
  id              bigserial primary key,
  event_id        uuid not null references public.events(id) on delete cascade,
  actor_user_id   uuid not null,
  action          public.seating_action not null,
  guest_id        uuid,
  from_seat_id    uuid,
  to_seat_id      uuid,
  from_table_id   uuid,
  to_table_id     uuid,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  undone_at       timestamptz,
  undone_by       uuid
);

create index if not exists idx_audit_event_recent
  on public.seating_audit (event_id, created_at desc)
  where undone_at is null;

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.tables           enable row level security;
alter table public.seats            enable row level security;
alter table public.seat_assignments enable row level security;
alter table public.seating_audit    enable row level security;

-- Helper: hanya OWNER/OPERATOR boleh write; semua member boleh read.
-- Kita pakai policy sederhana yang mirror guests.

drop policy if exists tables_rw_operator on public.tables;
create policy tables_rw_operator on public.tables
  for all using (
    exists (
      select 1 from public.event_members m
      where m.event_id = tables.event_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.event_members m
      where m.event_id = tables.event_id and m.user_id = auth.uid() and m.role in ('OWNER','OPERATOR')
    )
  );

drop policy if exists seats_rw_member on public.seats;
create policy seats_rw_member on public.seats
  for all using (
    exists (
      select 1 from public.tables t
      join public.event_members m on m.event_id = t.event_id
      where t.id = seats.table_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tables t
      join public.event_members m on m.event_id = t.event_id
      where t.id = seats.table_id and m.user_id = auth.uid() and m.role in ('OWNER','OPERATOR')
    )
  );

drop policy if exists assignments_rw_member on public.seat_assignments;
create policy assignments_rw_member on public.seat_assignments
  for all using (
    exists (
      select 1 from public.event_members m
      where m.event_id = seat_assignments.event_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.event_members m
      where m.event_id = seat_assignments.event_id and m.user_id = auth.uid() and m.role in ('OWNER','OPERATOR')
    )
  );

drop policy if exists audit_read_member on public.seating_audit;
create policy audit_read_member on public.seating_audit
  for select using (
    exists (
      select 1 from public.event_members m
      where m.event_id = seating_audit.event_id and m.user_id = auth.uid()
    )
  );

-- Hanya service-role yang insert ke audit (via backend).
-- RLS tidak punya policy INSERT → otomatis ditolak untuk anon.