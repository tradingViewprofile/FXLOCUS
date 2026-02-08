import "server-only";

import { dbAll, dbRun } from "@/lib/db/d1";

type Actor = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  leader_id?: string | null;
};

type NotificationPayload = {
  title: string;
  content: string;
};

function labelFor(actor: Actor) {
  return actor.full_name || actor.email || actor.id.slice(0, 6);
}

export async function notifyLeadersAndAdmins(actor: Actor, payload: NotificationPayload) {
  const admins = await dbAll<{ id: string }>(`select id from profiles where role = ?`, ["super_admin"]);

  const targets = new Set<string>();
  if (actor.leader_id) targets.add(actor.leader_id);
  (admins || []).forEach((row: any) => {
    if (row?.id) targets.add(row.id);
  });
  if (!targets.size) return;

  const now = new Date().toISOString();
  const rows = Array.from(targets).map((id) => ({
    id: crypto.randomUUID(),
    to_user_id: id,
    from_user_id: actor.id,
    title: payload.title,
    content: payload.content,
    created_at: now
  }));

  for (const r of rows) {
    await dbRun(
      `insert into notifications (id, to_user_id, from_user_id, title, content, created_at)
       values (?, ?, ?, ?, ?, ?)`,
      [r.id, r.to_user_id, r.from_user_id, r.title, r.content, r.created_at]
    );
  }
}

export async function notifySuperAdmins(payload: NotificationPayload) {
  const admins = await dbAll<{ id: string }>(`select id from profiles where role = ?`, ["super_admin"]);
  if (!admins?.length) return;
  const now = new Date().toISOString();
  for (const row of admins) {
    if (!row?.id) continue;
    await dbRun(
      `insert into notifications (id, to_user_id, from_user_id, title, content, created_at)
       values (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), row.id, null, payload.title, payload.content, now]
    );
  }
}

export function buildStudentSubmitContent(actor: Actor, zh: string, en: string) {
  const label = labelFor(actor);
  return `学员 ${label} ${zh}\n\nStudent ${label} ${en}`;
}

