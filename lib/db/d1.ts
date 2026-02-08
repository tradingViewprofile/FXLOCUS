import "server-only";

import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

type AnyRow = Record<string, any>;

function getDb(): any {
  const ctx = getOptionalRequestContext();
  const db = (ctx as any)?.env?.DB || (globalThis as any)?.DB;
  if (!db) {
    throw new Error("Missing D1 binding: DB (run via Cloudflare Pages/next-on-pages).");
  }
  return db;
}

export async function dbAll<T = AnyRow>(sql: string, params: any[] = []) {
  const db = getDb();
  const stmt = db.prepare(sql).bind(...params);
  const res = await stmt.all();
  return (res?.results || []) as T[];
}

export async function dbFirst<T = AnyRow>(sql: string, params: any[] = []) {
  const db = getDb();
  const stmt = db.prepare(sql).bind(...params);
  const row = await stmt.first();
  return (row ?? null) as T | null;
}

export async function dbRun(sql: string, params: any[] = []) {
  const db = getDb();
  const stmt = db.prepare(sql).bind(...params);
  return stmt.run();
}
