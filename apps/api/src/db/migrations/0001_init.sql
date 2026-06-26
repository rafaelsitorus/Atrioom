-- ============================================================================
-- 0001_init.sql — EPIC01 foundation
-- Tables: events, guests, event_members
-- Conventions:
--   - uuid PK (default gen_random_uuid())
--   - soft-delete via deleted_at timestamptz NULL
--   - row_version bigint for optimistic concurrency
--   - all mutating timestamps via trigger (set_updated_at)
--   - RLS enabled with policies bound to auth.uid()
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Helper: bump row_version + updated_at on UPDATE ────────────────────────
create or replace function public.fn_bump_row_version()
returns trigger
language plpgsql
as $$
begin
  new.updated_at  := now();
  new.row_version := coalesce(old.row_version, 0) + 1;
  return new;
end;
$$;

-- ─── events ────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null,                                -- tenant scope
  name            text not null check (char_length(name) between 1 and 200),
  venue           text,
  capacity        integer check (capacity is null or capacity > 0),
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  status          text not null default 'DRAFT'
                  check (status in ('DRAFT','PUBLISHED','ARCHIVED','LIVE','CLOSED')),
  created_by      uuid not null,                                -- auth.users.id
  offline_manifest_blob_path text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  row_version     bigint not null default 1,
  deleted_at      timestamptz
);

create index if not exists idx_events_org_status
  on public.events (org_id, status) where deleted_at is null;
create index if not exists idx_events_starts_at
  on public.events (starts_at desc) where deleted_at is null;

drop trigger if exists trg_events_bump on public.events;
create trigger trg_events_bump
  before update on public.events
  for each row execute function public.fn_bump_row_version();

-- ─── event_members — who can access this event ─────────────────────────────
create table if not exists public.event_members (
  event_id        uuid not null references public.events(id) on delete cascade,
  user_id         uuid not null,                                -- auth.users.id
  role            text not null default 'OPERATOR'
                  check (role in ('OWNER','OPERATOR','VIEWER')),
  created_at      timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists idx_event_members_user
  on public.event_members (user_id);

-- ─── guests ───────────────────────────────────────────────────────────────
create type public.guest_category as enum (
  'VVIP', 'VIP', 'MEDIA', 'REGULER', 'STAFF'
);

create table if not exists public.guests (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  full_name       text not null check (char_length(full_name) between 1 and 200),
  email           text,
  phone           text,
  category        public.guest_category not null default 'REGULER',
  is_vip          boolean not null default false,               -- denormalized for fast scan
  qr_token        text not null unique default encode(gen_random_bytes(16), 'hex'),
  plus_one_count  integer not null default 0 check (plus_one_count >= 0 and plus_one_count <= 10),
  diet_notes      text,                                         -- alergi / pantangan
  checked_in_at   timestamptz,
  checked_in_by   uuid,                                         -- trusted_devices.id or user.id
  source          text not null default 'MANUAL'
                  check (source in ('MANUAL','IMPORT','WALK_IN')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  row_version     bigint not null default 1,
  deleted_at      timestamptz
);

create index if not exists idx_guests_event_rowver
  on public.guests (event_id, row_version desc) where deleted_at is null;
create index if not exists idx_guests_event_category
  on public.guests (event_id, category) where deleted_at is null;
create index if not exists idx_guests_checked_in
  on public.guests (event_id, checked_in_at desc) where checked_in_at is not null;
create index if not exists idx_guests_qr_token
  on public.guests (qr_token);

drop trigger if exists trg_guests_bump on public.guests;
create trigger trg_guests_bump
  before update on public.guests
  for each row execute function public.fn_bump_row_version();

-- Sync is_vip when category changes
create or replace function public.fn_sync_is_vip()
returns trigger
language plpgsql
as $$
begin
  new.is_vip := new.category in ('VVIP','VIP');
  return new;
end;
$$;

drop trigger if exists trg_guests_sync_vip on public.guests;
create trigger trg_guests_sync_vip
  before insert or update of category on public.guests
  for each row execute function public.fn_sync_is_vip();

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.events       enable row level security;
alter table public.event_members enable row level security;
alter table public.guests        enable row level security;

-- events: org scope + membership scope
drop policy if exists events_select_member on public.events;
create policy events_select_member on public.events
  for select using (
    deleted_at is null
    and exists (
      select 1 from public.event_members m
      where m.event_id = events.id and m.user_id = auth.uid()
    )
  );

drop policy if exists events_insert_authenticated on public.events;
create policy events_insert_authenticated on public.events
  for insert with check (auth.uid() = created_by);

drop policy if exists events_update_owner on public.events;
create policy events_update_owner on public.events
  for update using (
    exists (
      select 1 from public.event_members m
      where m.event_id = events.id and m.user_id = auth.uid() and m.role in ('OWNER','OPERATOR')
    )
  );

-- event_members: only OWNER can manage
drop policy if exists event_members_select on public.event_members;
create policy event_members_select on public.event_members
  for select using (user_id = auth.uid());

drop policy if exists event_members_insert_owner on public.event_members;
create policy event_members_insert_owner on public.event_members
  for insert with check (
    exists (
      select 1 from public.event_members m
      where m.event_id = event_members.event_id and m.user_id = auth.uid() and m.role = 'OWNER'
    )
  );

-- guests: visible if user is event member
drop policy if exists guests_select_member on public.guests;
create policy guests_select_member on public.guests
  for select using (
    deleted_at is null
    and exists (
      select 1 from public.event_members m
      where m.event_id = guests.event_id and m.user_id = auth.uid()
    )
  );

drop policy if exists guests_write_operator on public.guests;
create policy guests_write_operator on public.guests
  for all using (
    exists (
      select 1 from public.event_members m
      where m.event_id = guests.event_id and m.user_id = auth.uid() and m.role in ('OWNER','OPERATOR')
    )
  )
  with check (
    exists (
      select 1 from public.event_members m
      where m.event_id = guests.event_id and m.user_id = auth.uid() and m.role in ('OWNER','OPERATOR')
    )
  );

-- Auto-add creator as OWNER member
create or replace function public.fn_events_auto_owner()
returns trigger
language plpgsql
as $$
begin
  insert into public.event_members (event_id, user_id, role)
  values (new.id, new.created_by, 'OWNER')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_events_auto_owner on public.events;
create trigger trg_events_auto_owner
  after insert on public.events
  for each row execute function public.fn_events_auto_owner();