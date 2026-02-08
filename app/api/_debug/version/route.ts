export async function GET() {
  return Response.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA,
    env: process.env.VERCEL_ENV,
    time: new Date().toISOString(),
  });
}
