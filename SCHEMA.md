# FxLocus D1 Schema Notes

This repo uses Cloudflare D1 (SQLite). Supabase auth/RLS is not used.

## Core Tables
- `public.profiles`: users, roles, leadership tree, session fields (`session_id`, `session_expires_at`, `password_hash`).
- `public.role_audit_logs`, `public.notifications`: audit + notifications.
- Courses: `public.courses`, `public.course_access`, `public.course_notes`.
- Files: `public.files`, `public.file_permissions`, `public.file_access_requests`, `public.file_download_logs`.
- Submissions: `public.trade_submissions`, `public.trade_submission_files`, `public.classic_trades`, `public.weekly_summaries`.
- Records/forms: `public.records`, `public.contact_submissions`, `public.donation_applications`, `public.donation_metrics`.
- Ladder: `public.ladder_authorizations`, `public.ladder_snapshots`, `public.ladder_config`.
- News: `public.news_sources`, `public.news_raw`, `public.news_articles`, `public.news_metrics`, `public.news_bookmarks`.
- Coaching: `public.coach_assignments`.
- Locks: `public.job_runs`.

## Auth Model
- Authentication is handled by the app (JWT cookie), not by database RLS.
- Passwords are stored in `profiles.password_hash` (bcrypt).

## Bootstrap
Use the script to create a super admin:
```bash
npm run create-admin -- --email you@example.com --password 'YourPassword123!' --name 'Super Admin'
```

## Schema File
Apply schema with:
```bash
wrangler d1 execute <db-name> --file=supabase.sql
```
