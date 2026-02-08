-- FxLocus D1 (SQLite) schema
-- Apply with: wrangler d1 execute <db-name> --file=supabase.sql

PRAGMA foreign_keys = ON;

-- Profiles (users)
create table if not exists profiles (
  id text primary key default (lower(hex(randomblob(16)))),
  email text unique,
  full_name text,
  phone text,
  role text not null default 'student',
  leader_id text references profiles(id) on delete set null,
  student_status text not null default '普通学员',
  is_coach integer not null default 0,
  source text,
  status text not null default 'active',
  avatar_url text,
  password_hash text,
  last_login_at text,
  last_login_ip text,
  last_login_user_agent text,
  session_id text,
  session_expires_at text,
  created_by text references profiles(id) on delete set null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create index if not exists profiles_role_idx on profiles(role);
create index if not exists profiles_leader_idx on profiles(leader_id);
create index if not exists profiles_session_idx on profiles(session_id);
create index if not exists profiles_email_idx on profiles(email);

-- Role audit & notifications
create table if not exists role_audit_logs (
  id text primary key default (lower(hex(randomblob(16)))),
  target_id text not null references profiles(id) on delete cascade,
  actor_id text not null references profiles(id) on delete cascade,
  from_role text not null,
  to_role text not null,
  reason text,
  created_at text not null default (datetime('now'))
);

create table if not exists notifications (
  id text primary key default (lower(hex(randomblob(16)))),
  to_user_id text not null references profiles(id) on delete cascade,
  from_user_id text references profiles(id) on delete set null,
  title text not null,
  content text,
  read_at text,
  created_at text not null default (datetime('now'))
);
create index if not exists notifications_to_user_idx on notifications(to_user_id, read_at, created_at);

-- Consult messages
create table if not exists consult_messages (
  id text primary key default (lower(hex(randomblob(16)))),
  from_user_id text not null references profiles(id) on delete cascade,
  to_user_id text not null references profiles(id) on delete cascade,
  content_type text not null default 'text',
  content_text text,
  image_bucket text,
  image_path text,
  image_name text,
  image_mime_type text,
  image_size_bytes integer,
  read_at text,
  created_at text not null default (datetime('now'))
);
create index if not exists consult_messages_pair_idx on consult_messages(from_user_id, to_user_id, created_at);
create index if not exists consult_messages_to_idx on consult_messages(to_user_id, read_at, created_at);

-- Courses
create table if not exists courses (
  id integer primary key,
  title_zh text,
  title_en text,
  pillar text,
  category_id integer,
  order_id integer,
  min_days integer,
  max_days integer,
  cover_url text,
  intro_zh text,
  intro_en text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists course_access (
  id text primary key default (lower(hex(randomblob(16)))),
  user_id text not null references profiles(id) on delete cascade,
  course_id integer not null references courses(id) on delete cascade,
  status text not null default 'requested',
  progress integer not null default 0,
  requested_at text not null default (datetime('now')),
  reviewed_at text,
  reviewed_by text references profiles(id) on delete set null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists course_access_user_idx on course_access(user_id, status);
create index if not exists course_access_status_idx on course_access(status);

create table if not exists course_notes (
  id text primary key default (lower(hex(randomblob(16)))),
  user_id text not null references profiles(id) on delete cascade,
  course_id integer not null references courses(id) on delete cascade,
  lesson_id integer,
  content text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists course_notes_user_idx on course_notes(user_id, course_id, lesson_id);

-- Files
create table if not exists files (
  id text primary key default (lower(hex(randomblob(16)))),
  name text not null,
  description text,
  category text,
  mime_type text,
  size_bytes integer,
  storage_bucket text,
  storage_path text,
  storage_name text,
  uploader_id text references profiles(id) on delete set null,
  course_id integer references courses(id) on delete set null,
  lesson_id integer,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists files_category_idx on files(category, created_at);

create table if not exists file_permissions (
  id text primary key default (lower(hex(randomblob(16)))),
  file_id text not null references files(id) on delete cascade,
  grantee_profile_id text not null references profiles(id) on delete cascade,
  granted_by text references profiles(id) on delete set null,
  created_at text not null default (datetime('now'))
);
create index if not exists file_permissions_grantee_idx on file_permissions(grantee_profile_id, file_id);

create table if not exists file_access_requests (
  id text primary key default (lower(hex(randomblob(16)))),
  file_id text not null references files(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  status text not null default 'requested',
  rejection_reason text,
  requested_at text not null default (datetime('now')),
  reviewed_at text,
  reviewed_by text references profiles(id) on delete set null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists file_access_requests_status_idx on file_access_requests(status, requested_at);

create table if not exists file_download_logs (
  id text primary key default (lower(hex(randomblob(16)))),
  user_id text not null references profiles(id) on delete cascade,
  file_id text not null references files(id) on delete cascade,
  downloaded_at text not null default (datetime('now'))
);
create index if not exists file_download_logs_user_idx on file_download_logs(user_id, downloaded_at);

-- Trade submissions
create table if not exists trade_submissions (
  id text primary key default (lower(hex(randomblob(16)))),
  user_id text not null references profiles(id) on delete cascade,
  type text not null default 'daily',
  status text not null default 'submitted',
  payload text,
  reviewed_by text references profiles(id) on delete set null,
  reviewed_at text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists trade_submissions_user_idx on trade_submissions(user_id, created_at);
create index if not exists trade_submissions_type_idx on trade_submissions(type, status);

create table if not exists trade_submission_files (
  id text primary key default (lower(hex(randomblob(16)))),
  submission_id text not null references trade_submissions(id) on delete cascade,
  file_id text not null references files(id) on delete cascade,
  created_at text not null default (datetime('now'))
);
create index if not exists trade_submission_files_submission_idx on trade_submission_files(submission_id);

-- Classic trades / weekly summaries
create table if not exists classic_trades (
  id text primary key default (lower(hex(randomblob(16)))),
  user_id text not null references profiles(id) on delete cascade,
  title text,
  content text,
  image_bucket text,
  image_path text,
  image_name text,
  image_mime_type text,
  image_size_bytes integer,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists classic_trades_user_idx on classic_trades(user_id, created_at);

create table if not exists weekly_summaries (
  id text primary key default (lower(hex(randomblob(16)))),
  user_id text not null references profiles(id) on delete cascade,
  week text,
  strategy_file_id text,
  curve_file_id text,
  stats_file_id text,
  status text not null default 'submitted',
  reviewed_by text references profiles(id) on delete set null,
  reviewed_at text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists weekly_summaries_user_idx on weekly_summaries(user_id, created_at);

-- Records / forms
create table if not exists records (
  id text primary key default (lower(hex(randomblob(16)))),
  type text not null,
  email text,
  locale text,
  payload text,
  created_at text not null default (datetime('now'))
);
create index if not exists records_email_created_at on records(email, created_at);
create index if not exists records_locale_created_at on records(locale, created_at);

create table if not exists contact_submissions (
  id text primary key default (lower(hex(randomblob(16)))),
  name text,
  email text,
  message text,
  locale text,
  created_at text not null default (datetime('now'))
);

create table if not exists donation_metrics (
  id text primary key default (lower(hex(randomblob(16)))),
  amount_cents integer not null default 0,
  captured_at text not null default (datetime('now')),
  created_at text not null default (datetime('now'))
);

create table if not exists donation_applications (
  id text primary key default (lower(hex(randomblob(16)))),
  user_id text references profiles(id) on delete set null,
  name text,
  email text,
  phone text,
  reason text,
  status text not null default 'pending',
  reviewed_by text references profiles(id) on delete set null,
  reviewed_at text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists student_documents (
  id text primary key default (lower(hex(randomblob(16)))),
  user_id text not null references profiles(id) on delete cascade,
  doc_type text not null,
  storage_bucket text,
  storage_path text,
  storage_name text,
  status text not null default 'submitted',
  reviewed_by text references profiles(id) on delete set null,
  reviewed_at text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists student_documents_user_idx on student_documents(user_id, status, created_at);

-- Ladder
create table if not exists ladder_authorizations (
  id text primary key default (lower(hex(randomblob(16)))),
  user_id text not null references profiles(id) on delete cascade,
  status text not null default 'requested',
  requested_at text not null default (datetime('now')),
  reviewed_at text,
  reviewed_by text references profiles(id) on delete set null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists ladder_authorizations_status_idx on ladder_authorizations(status, requested_at);

create table if not exists ladder_snapshots (
  id text primary key default (lower(hex(randomblob(16)))),
  payload text,
  created_at text not null default (datetime('now'))
);

create table if not exists ladder_config (
  id text primary key default (lower(hex(randomblob(16)))),
  banner_url text,
  cover_url text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

-- News
create table if not exists news_sources (
  id text primary key default (lower(hex(randomblob(16)))),
  source text not null,
  name text not null,
  url text,
  category text,
  active integer not null default 1,
  created_at text not null default (datetime('now'))
);

create table if not exists news_raw (
  id text primary key default (lower(hex(randomblob(16)))),
  source_id text references news_sources(id) on delete set null,
  title text,
  url text unique,
  content text,
  published_at text,
  created_at text not null default (datetime('now'))
);
create index if not exists news_raw_published_idx on news_raw(published_at);

create table if not exists news_articles (
  id text primary key default (lower(hex(randomblob(16)))),
  source_id text references news_sources(id) on delete set null,
  raw_id text references news_raw(id) on delete set null,
  title text,
  summary text,
  url text,
  locale text,
  status text not null default 'pending',
  published_at text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists news_articles_status_idx on news_articles(status, created_at);

create table if not exists news_metrics (
  id text primary key default (lower(hex(randomblob(16)))),
  article_id text not null references news_articles(id) on delete cascade,
  metric text not null,
  count integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists news_metrics_article_idx on news_metrics(article_id, metric);

create table if not exists news_bookmarks (
  id text primary key default (lower(hex(randomblob(16)))),
  user_id text not null references profiles(id) on delete cascade,
  article_id text not null references news_articles(id) on delete cascade,
  created_at text not null default (datetime('now'))
);
create index if not exists news_bookmarks_user_idx on news_bookmarks(user_id, created_at);

-- Coaching
create table if not exists coach_assignments (
  id text primary key default (lower(hex(randomblob(16)))),
  coach_id text not null references profiles(id) on delete cascade,
  assigned_user_id text not null references profiles(id) on delete cascade,
  created_at text not null default (datetime('now'))
);
create index if not exists coach_assignments_coach_idx on coach_assignments(coach_id, assigned_user_id);

-- Job locks
create table if not exists job_runs (
  job_name text primary key,
  running integer not null default 0,
  locked_until text,
  last_started_at text,
  last_finished_at text,
  last_error text
);
