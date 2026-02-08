import "server-only";

import { dbRun, dbFirst } from "@/lib/db/d1";

export type RecordInsert = {
  type: string;
  email?: string | null;
  name?: string | null;
  locale?: string | null;
  payload?: any;
  content?: string | null;
};

export async function insertRecord(row: RecordInsert) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await dbRun(
    `insert into records (id, type, email, name, locale, payload, content, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      row.type,
      row.email ?? null,
      row.name ?? null,
      row.locale ?? null,
      row.payload ? JSON.stringify(row.payload) : null,
      row.content ?? null,
      createdAt
    ]
  );
}

export async function insertRecordReturning(row: RecordInsert) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await dbRun(
    `insert into records (id, type, email, name, locale, payload, content, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      row.type,
      row.email ?? null,
      row.name ?? null,
      row.locale ?? null,
      row.payload ? JSON.stringify(row.payload) : null,
      row.content ?? null,
      createdAt
    ]
  );
  const saved = await dbFirst<{ id: string; created_at: string }>(
    `select id, created_at from records where id = ?`,
    [id]
  );
  if (!saved) throw new Error("Failed to insert record.");
  return saved;
}

export type ContactSubmissionInsert = {
  name?: string | null;
  email: string;
  wechat?: string | null;
  intent?: string | null;
  bottleneck?: string | null;
  instruments?: string[] | null;
  message?: string | null;
  locale?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  payload?: any;
};

export async function insertContactSubmission(row: ContactSubmissionInsert) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await dbRun(
    `insert into contact_submissions
      (id, name, email, wechat, intent, bottleneck, instruments_json, message, locale, ip, user_agent, payload, created_at)
     values
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      row.name ?? null,
      row.email,
      row.wechat ?? null,
      row.intent ?? null,
      row.bottleneck ?? null,
      JSON.stringify(row.instruments ?? []),
      row.message ?? null,
      row.locale ?? null,
      row.ip ?? null,
      row.userAgent ?? null,
      row.payload ? JSON.stringify(row.payload) : null,
      createdAt
    ]
  );
}

export type DonationApplicationInsert = {
  email: string;
  name: string;
  wechat?: string | null;
  locale?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  payload?: any;
};

export async function insertDonationApplication(row: DonationApplicationInsert) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await dbRun(
    `insert into donation_applications
      (id, email, name, wechat, locale, ip, user_agent, payload, created_at)
     values
      (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      row.email,
      row.name,
      row.wechat ?? null,
      row.locale ?? null,
      row.ip ?? null,
      row.userAgent ?? null,
      row.payload ? JSON.stringify(row.payload) : null,
      createdAt
    ]
  );
}

