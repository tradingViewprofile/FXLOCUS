# FxLocus Trading

Next.js (App Router) + Cloudflare Pages + Cloudflare D1. Supabase has been removed.

## Local dev
```bash
npm install
npm run dev
```

## Environment variables (runtime)
Required:
- `SYSTEM_JWT_SECRET`

Optional:
- `RESEND_API_KEY`
- `APP_BASE_URL`
- S3-compatible storage (if you need uploads via presigned URLs)
  - `R2_ENDPOINT`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_PUBLIC_BASE_URL`

## Bootstrap admin
```bash
npm run create-admin -- --email you@example.com --password 'YourPassword123!' --name 'Super Admin'
```

## Deployment (Cloudflare Pages + D1)
See `docs/cloudflare-pages-d1.md`.
