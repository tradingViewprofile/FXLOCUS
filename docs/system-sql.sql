-- FxLocus system schema updates for new features.

-- 1) File access requests
create table if not exists public.file_access_requests (
  user_id uuid not null,
  file_id uuid not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  primary key (user_id, file_id)
);

-- 2) Course content fields
alter table if exists public.courses
  add column if not exists content_bucket text,
  add column if not exists content_path text,
  add column if not exists content_mime_type text,
  add column if not exists content_file_name text,
  add column if not exists published boolean not null default false,
  add column if not exists deleted_at timestamptz;

-- 3) Password audit fields
alter table if exists public.system_users
  add column if not exists password_updated_at timestamptz,
  add column if not exists password_updated_by uuid,
  add column if not exists password_updated_reason text;

-- 4) Ladder authorization status fields (if you haven't added them yet)
alter table if exists public.ladder_authorizations
  add column if not exists status text not null default 'none',
  add column if not exists requested_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists rejection_reason text;

