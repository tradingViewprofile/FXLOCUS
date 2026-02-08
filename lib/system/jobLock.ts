import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export type JobLockResult = { ok: true } | { ok: false; error: string };

export async function acquireJobLock(jobName: string, lockSeconds: number): Promise<JobLockResult> {
  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc("try_job_lock", {
    _job_name: jobName,
    _lock_seconds: lockSeconds
  });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "JOB_LOCKED" };
  return { ok: true };
}

export async function releaseJobLock(jobName: string, errorMessage?: string | null) {
  const admin = supabaseAdmin();
  await admin.rpc("release_job_lock", {
    _job_name: jobName,
    _error: errorMessage ?? null
  });
}
