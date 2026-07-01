-- ============================================================================
-- 0003_checkin.sql — EPIC03 foundation
-- Tables: check_ins (idempotent, unique qr_token),
--         check_in_audit (untuk VIP alert dashboard + audit trail)
-- ============================================================================

-- Cleanup: drop index bentrok dari run sebelumnya jika ada
drop index if exists public.idx_audit_event_recent;

-- ─── check_ins ────────────────────────────────────────────────────────────
create type public.check_in_result as enum ('SUCCESS', 'ALREADY_CHECKED_IN', 'NOT_FOUND', 'WALK_IN');

create table if not exists public.check_ins (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  guest_id          uuid not null references public.guests(id) on delete cascade,
  scanned_at        timestamptz not null default now(),
  scanned_by        uuid not null,                          -- auth.users.id operator scanner
  scanned_by_device text,                                    -- device fingerprint (trusted_devices)
  idempotency_key   text not null,                          -- SHA256(deviceId + guestId + scannedEpochSec)
  result            public.check_in_result not null default 'SUCCESS',
  -- Untuk ALREADY_CHECKED_IN, tautkan ke check_in row original
  previous_check_in_id uuid references public.check_ins(id),
  created_at        timestamptz not null default now()
);

-- Idempotency: 1 scan dari device yang sama untuk tamu yang sama persis di detik yang sama
-- menghasilkan 1 row. Tanpa ini, double-scan dari 1 device akan jadi 2 row.
create unique index if not exists uq_checkin_idempotency
  on public.check_ins (idempotency_key);

-- Lookup index untuk "siapa saja yang sudah check-in di event ini"
create index if not exists idx_checkins_event_time
  on public.check_ins (event_id, scanned_at desc);

-- Lookup index untuk "siapa operator-nya?"
create index if not exists idx_checkins_guest
  on public.check_ins (guest_id);

-- Partial index: hanya SUCCESS yang count sebagai "sudah check-in"
-- Berguna untuk "sudah berapa orang check-in hari ini" — exclude duplicates.
create index if not exists idx_checkins_event_success
  on public.check_ins (event_id, scanned_at desc)
  where result = 'SUCCESS';

-- ─── check_in_audit (append-only, untuk dashboard admin realtime + VIP alert) ─
create table if not exists public.check_in_audit (
  id              bigserial primary key,
  check_in_id     uuid not null references public.check_ins(id) on delete cascade,
  event_id        uuid not null,
  guest_id        uuid not null,
  guest_category  public.guest_category not null,
  is_vip          boolean not null default false,
  guest_name      text not null,
  scanned_at      timestamptz not null,
  seat_label      text,
  table_label     text,
  diet_notes      text,
  notification_sent boolean not null default false
);

create index if not exists idx_checkin_audit_event_recent
  on public.check_in_audit (event_id, scanned_at desc);

create index if not exists idx_checkin_audit_vip_recent
  on public.check_in_audit (event_id, scanned_at desc)
  where is_vip = true;

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.check_ins enable row level security;
alter table public.check_in_audit enable row level security;

drop policy if exists checkins_read_member on public.check_ins;
create policy checkins_read_member on public.check_ins
  for select using (
    exists (
      select 1 from public.event_members m
      where m.event_id = check_ins.event_id and m.user_id = auth.uid()
    )
  );

-- Write hanya via service-role (backend Fastify)
-- RLS tidak punya policy INSERT → otomatis ditolak untuk anon key.

drop policy if exists audit_read_member on public.check_in_audit;
create policy audit_read_member on public.check_in_audit
  for select using (
    exists (
      select 1 from public.event_members m
      where m.event_id = check_in_audit.event_id and m.user_id = auth.uid()
    )
  );

-- ─── Trigger: auto-insert ke audit saat check-in ───────────────────────────
create or replace function public.fn_checkin_to_audit()
returns trigger
language plpgsql
as $$
declare
  v_guest_name text;
  v_guest_category public.guest_category;
  v_is_vip boolean;
  v_diet_notes text;
  v_seat_label text;
  v_table_label text;
begin
  select full_name, category, is_vip, diet_notes
    into v_guest_name, v_guest_category, v_is_vip, v_diet_notes
  from public.guests where id = new.guest_id;

  -- Lookup seat info (jika ada assignment aktif)
  select s.seat_label, t.label
    into v_seat_label, v_table_label
  from public.seat_assignments sa
  join public.seats s on s.id = sa.seat_id
  join public.tables t on t.id = s.table_id
  where sa.guest_id = new.guest_id and sa.deleted_at is null
  limit 1;

  insert into public.check_in_audit (
    check_in_id, event_id, guest_id, guest_category, is_vip, guest_name,
    scanned_at, seat_label, table_label, diet_notes
  ) values (
    new.id, new.event_id, new.guest_id, v_guest_category, v_is_vip, v_guest_name,
    new.scanned_at, v_seat_label, v_table_label, v_diet_notes
  );

  return new;
end;
$$;

drop trigger if exists trg_checkin_audit on public.check_ins;
create trigger trg_checkin_audit
  after insert on public.check_ins
  for each row execute function public.fn_checkin_to_audit();

-- ─── Supabase Realtime publication ────────────────────────────────────────
-- Supabase Realtime publishes rows dari tabel via logical replication.
-- Kita perlu add check_in_audit ke publication `supabase_realtime`.
-- Command ini idempotent — safe jika publication belum ada (akan skip).

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    -- Add table hanya jika belum ada
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'check_in_audit'
    ) then
      alter publication supabase_realtime add table public.check_in_audit;
    end if;
  end if;
end
$$;