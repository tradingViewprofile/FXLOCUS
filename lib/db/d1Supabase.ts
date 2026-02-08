import "server-only";

import { dbAll, dbFirst, dbRun } from "@/lib/db/d1";

type SupabaseError = { message: string; code?: string };
type QueryResult = { data: any; error: SupabaseError | null; count?: number | null };

type SelectOptions =
  | {
      count?: "exact";
      head?: boolean;
    }
  | undefined;

type OrderOptions =
  | {
      ascending?: boolean;
    }
  | undefined;

type UpsertOptions =
  | {
      onConflict?: string;
      ignoreDuplicates?: boolean;
    }
  | undefined;

type QueryOp = "select" | "insert" | "update" | "delete" | "upsert";

type Filter =
  | { kind: "raw"; sql: string; params: any[] }
  | { kind: "eq"; col: string; val: any }
  | { kind: "in"; col: string; vals: any[] }
  | { kind: "is"; col: string; val: any }
  | { kind: "gt"; col: string; val: any }
  | { kind: "gte"; col: string; val: any }
  | { kind: "lt"; col: string; val: any }
  | { kind: "lte"; col: string; val: any }
  | { kind: "ilike"; col: string; pattern: string }
  | { kind: "or"; expr: string };

function isSafeIdent(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function qIdent(value: string) {
  if (!isSafeIdent(value)) throw new Error(`Unsafe identifier: ${value}`);
  return `"${value}"`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeDbValue(key: string, value: any) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "object") {
    if (key === "payload" || key.endsWith("_json")) return JSON.stringify(value);
  }
  return value;
}

const gCols = globalThis as any;
if (!gCols.__fx_d1_cols_cache) gCols.__fx_d1_cols_cache = new Map<string, Set<string>>();
const colsCache: Map<string, Set<string>> = gCols.__fx_d1_cols_cache;

async function tableColumns(table: string) {
  const cached = colsCache.get(table);
  if (cached) return cached;
  if (!isSafeIdent(table)) throw new Error(`Unsafe table: ${table}`);
  const rows = await dbAll<{ name: string }>(`pragma table_info(${qIdent(table)})`);
  const set = new Set<string>();
  for (const r of rows) {
    if (r?.name) set.add(String(r.name));
  }
  colsCache.set(table, set);
  return set;
}

function normalizeSelectColumns(columns: string) {
  const raw = String(columns || "*").trim();
  if (raw === "*" || raw === "") return "*";
  // Prevent accidental "news_sources(...)" style PostgREST selects; those are handled in bespoke SQL.
  if (raw.includes("(") || raw.includes(")")) {
    throw new Error("Unsupported select syntax (nested columns). Use explicit SQL joins.");
  }
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const safe = parts.map((p) => {
    if (p === "*") return "*";
    if (!isSafeIdent(p)) throw new Error(`Unsafe column: ${p}`);
    return qIdent(p);
  });
  return safe.join(", ");
}

function buildWhere(filters: Filter[]) {
  const clauses: string[] = [];
  const params: any[] = [];

  for (const f of filters) {
    if (f.kind === "raw") {
      clauses.push(`(${f.sql})`);
      params.push(...f.params);
      continue;
    }
    if (f.kind === "eq") {
      if (f.val === null) {
        clauses.push(`${qIdent(f.col)} is null`);
      } else {
        clauses.push(`${qIdent(f.col)} = ?`);
        params.push(f.val);
      }
      continue;
    }
    if (f.kind === "in") {
      const vals = Array.isArray(f.vals) ? f.vals : [];
      if (!vals.length) {
        clauses.push("1=0");
        continue;
      }
      clauses.push(`${qIdent(f.col)} in (${vals.map(() => "?").join(",")})`);
      params.push(...vals);
      continue;
    }
    if (f.kind === "is") {
      if (f.val === null) clauses.push(`${qIdent(f.col)} is null`);
      else clauses.push(`${qIdent(f.col)} is ?`);
      if (f.val !== null) params.push(f.val);
      continue;
    }
    if (f.kind === "gt") {
      clauses.push(`${qIdent(f.col)} > ?`);
      params.push(f.val);
      continue;
    }
    if (f.kind === "gte") {
      clauses.push(`${qIdent(f.col)} >= ?`);
      params.push(f.val);
      continue;
    }
    if (f.kind === "lt") {
      clauses.push(`${qIdent(f.col)} < ?`);
      params.push(f.val);
      continue;
    }
    if (f.kind === "lte") {
      clauses.push(`${qIdent(f.col)} <= ?`);
      params.push(f.val);
      continue;
    }
    if (f.kind === "ilike") {
      clauses.push(`lower(${qIdent(f.col)}) like lower(?)`);
      params.push(f.pattern);
      continue;
    }
    if (f.kind === "or") {
      const { sql, bind } = parseOrExpr(f.expr);
      clauses.push(`(${sql})`);
      params.push(...bind);
      continue;
    }
  }

  if (!clauses.length) return { where: "", params: [] as any[] };
  return { where: `where ${clauses.join(" and ")}`, params };
}

// Minimal PostgREST `or()` parser that supports the patterns used in this repo:
// - "a.eq.1,b.eq.2"
// - "title.ilike.%q%,title2.ilike.%q%"
// - "and(a.eq.1,b.eq.2),and(a.eq.3,b.eq.4)"
function parseOrExpr(expr: string) {
  const parts = splitTopLevel(expr);
  const groupSql: string[] = [];
  const bind: any[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("and(") && trimmed.endsWith(")")) {
      const inner = trimmed.slice(4, -1);
      const andParts = splitTopLevel(inner);
      const andSql: string[] = [];
      for (const ap of andParts) {
        const cond = parseCond(ap.trim());
        andSql.push(cond.sql);
        bind.push(...cond.bind);
      }
      groupSql.push(`(${andSql.join(" and ")})`);
      continue;
    }
    const cond = parseCond(trimmed);
    groupSql.push(`(${cond.sql})`);
    bind.push(...cond.bind);
  }

  if (!groupSql.length) return { sql: "1=0", bind: [] as any[] };
  return { sql: groupSql.join(" or "), bind };
}

function splitTopLevel(value: string) {
  const out: string[] = [];
  let cur = "";
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function parseCond(value: string) {
  // format: col.op.val
  const firstDot = value.indexOf(".");
  const secondDot = firstDot >= 0 ? value.indexOf(".", firstDot + 1) : -1;
  if (firstDot <= 0 || secondDot <= firstDot + 1) {
    throw new Error(`Unsupported or() condition: ${value}`);
  }
  const col = value.slice(0, firstDot);
  const op = value.slice(firstDot + 1, secondDot);
  const rawVal = value.slice(secondDot + 1);

  if (!isSafeIdent(col)) throw new Error(`Unsafe column in or(): ${col}`);

  if (op === "eq") {
    return { sql: `${qIdent(col)} = ?`, bind: [decodeOrValue(rawVal)] as any[] };
  }
  if (op === "ilike") {
    return { sql: `lower(${qIdent(col)}) like lower(?)`, bind: [decodeOrValue(rawVal)] as any[] };
  }
  throw new Error(`Unsupported or() op: ${op}`);
}

function decodeOrValue(v: string) {
  // Supabase or() values often include %...% patterns or plain strings.
  return v;
}

class QueryBuilder {
  private table: string;
  private op: QueryOp = "select";
  private selectCols: string = "*";
  private selectOptions: SelectOptions;
  private returningCols: string | null = null;
  private orderBy: { col: string; asc: boolean } | null = null;
  private rangeBy: { from: number; to: number } | null = null;
  private limitN: number | null = null;
  private filters: Filter[] = [];
  private payload: any = null;
  private upsertOptions: UpsertOptions;
  private wantMaybeSingle = false;
  private wantSingle = false;

  constructor(table: string) {
    if (!isSafeIdent(table)) throw new Error(`Unsafe table: ${table}`);
    this.table = table;
  }

  select(columns: string, options?: SelectOptions) {
    if (this.op === "select") {
      this.selectCols = columns || "*";
      this.selectOptions = options;
    } else {
      // "returning" selection for insert/update/upsert flows.
      this.returningCols = columns || "*";
    }
    return this;
  }

  insert(values: any) {
    this.op = "insert";
    this.payload = values;
    return this;
  }

  update(values: any) {
    this.op = "update";
    this.payload = values;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  upsert(values: any, options?: UpsertOptions) {
    this.op = "upsert";
    this.payload = values;
    this.upsertOptions = options;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ kind: "eq", col, val });
    return this;
  }

  in(col: string, vals: readonly any[]) {
    this.filters.push({ kind: "in", col, vals: Array.isArray(vals) ? [...vals] : [] });
    return this;
  }

  is(col: string, val: any) {
    this.filters.push({ kind: "is", col, val });
    return this;
  }

  not(col: string, op: string, val: any) {
    const operator = String(op || "").trim().toLowerCase();
    if (operator === "is" && val === null) {
      this.filters.push({ kind: "raw", sql: `${qIdent(col)} is not null`, params: [] });
      return this;
    }
    if (operator === "eq") {
      this.filters.push({ kind: "raw", sql: `${qIdent(col)} != ?`, params: [val] });
      return this;
    }
    if (operator === "ilike") {
      this.filters.push({
        kind: "raw",
        sql: `lower(${qIdent(col)}) not like lower(?)`,
        params: [String(val)]
      });
      return this;
    }
    throw new Error(`Unsupported not() operator: ${op}`);
  }

  gt(col: string, val: any) {
    this.filters.push({ kind: "gt", col, val });
    return this;
  }

  gte(col: string, val: any) {
    this.filters.push({ kind: "gte", col, val });
    return this;
  }

  lt(col: string, val: any) {
    this.filters.push({ kind: "lt", col, val });
    return this;
  }

  lte(col: string, val: any) {
    this.filters.push({ kind: "lte", col, val });
    return this;
  }

  ilike(col: string, pattern: string) {
    this.filters.push({ kind: "ilike", col, pattern });
    return this;
  }

  or(expr: string) {
    this.filters.push({ kind: "or", expr });
    return this;
  }

  order(col: string, options?: OrderOptions) {
    this.orderBy = { col, asc: options?.ascending !== false };
    return this;
  }

  range(from: number, to: number) {
    this.rangeBy = { from, to };
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  maybeSingle() {
    this.wantMaybeSingle = true;
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  // Make it awaitable like Supabase PostgREST query builder.
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }

  private async execute(): Promise<QueryResult> {
    try {
      if (this.op === "select") {
        return await this.execSelect();
      }
      if (this.op === "insert") {
        return await this.execInsert();
      }
      if (this.op === "update") {
        return await this.execUpdate();
      }
      if (this.op === "delete") {
        return await this.execDelete();
      }
      if (this.op === "upsert") {
        return await this.execUpsert();
      }
      return { data: null, error: { message: "UNSUPPORTED_OP" } };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? "DB_ERROR" } };
    }
  }

  private async execSelect() {
    const { where, params } = buildWhere(this.filters);
    const order = this.orderBy
      ? `order by ${qIdent(this.orderBy.col)} ${this.orderBy.asc ? "asc" : "desc"}`
      : "";

    let limit = "";
    let bind = [...params];
    if (this.rangeBy) {
      const from = Math.max(0, Number(this.rangeBy.from) || 0);
      const to = Math.max(from, Number(this.rangeBy.to) || from);
      const size = to - from + 1;
      limit = `limit ${size} offset ${from}`;
    } else if (typeof this.limitN === "number") {
      limit = `limit ${Math.max(0, this.limitN)}`;
    }

    const wantCount = this.selectOptions?.count === "exact";
    const headOnly = Boolean(this.selectOptions?.head);

    if (wantCount && headOnly) {
      const row = await dbFirst<{ count: number }>(
        `select count(*) as count from ${qIdent(this.table)} ${where}`.trim(),
        bind
      );
      return { data: null, error: null, count: Number(row?.count || 0) };
    }

    const cols = normalizeSelectColumns(this.selectCols);
    const sql = `select ${cols} from ${qIdent(this.table)} ${where} ${order} ${limit}`.trim();
    const rows = await dbAll<any>(sql, bind);

    let count: number | null | undefined = undefined;
    if (wantCount) {
      const row = await dbFirst<{ count: number }>(
        `select count(*) as count from ${qIdent(this.table)} ${where}`.trim(),
        bind
      );
      count = Number(row?.count || 0);
    }

    if (this.wantMaybeSingle || this.wantSingle) {
      const one = rows.length ? rows[0] : null;
      if (this.wantSingle) {
        if (!one) return { data: null, error: { message: "PGRST116" } };
        if (rows.length > 1) return { data: null, error: { message: "PGRST117" } };
      }
      return { data: one, error: null, count: count ?? null };
    }

    return { data: rows, error: null, count: count ?? null };
  }

  private async execInsert() {
    const colsSet = await tableColumns(this.table);
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
    const inserted: any[] = [];
    for (const r of rows) {
      const row = { ...(r || {}) };
      if (colsSet.has("id") && row.id === undefined) row.id = crypto.randomUUID();
      if (colsSet.has("created_at") && row.created_at === undefined) row.created_at = nowIso();
      if (colsSet.has("updated_at") && row.updated_at === undefined) row.updated_at = nowIso();
      if (colsSet.has("requested_at") && row.requested_at === undefined) row.requested_at = nowIso();
      if (colsSet.has("downloaded_at") && row.downloaded_at === undefined) row.downloaded_at = nowIso();
      if (colsSet.has("captured_at") && row.captured_at === undefined) row.captured_at = nowIso();

      const keys = Object.keys(row).filter((k) => colsSet.has(k));
      if (!keys.length) continue;
      const cols = keys.map((k) => qIdent(k)).join(", ");
      const ph = keys.map(() => "?").join(", ");
      const params = keys.map((k) => normalizeDbValue(k, row[k]));
      await dbRun(`insert into ${qIdent(this.table)} (${cols}) values (${ph})`, params);
      inserted.push(row);
    }

    if (this.returningCols) {
      const one = inserted[0] || null;
      if (!one) return { data: null, error: null };
      if (colsSet.has("id") && one.id) {
        const cols = normalizeSelectColumns(this.returningCols);
        const row = await dbFirst<any>(
          `select ${cols} from ${qIdent(this.table)} where id = ? limit 1`,
          [one.id]
        );
        if (this.wantSingle && !row) return { data: null, error: { message: "PGRST116" } };
        return { data: row, error: null };
      }
      return { data: null, error: { message: "RETURNING_UNSUPPORTED" } };
    }

    return { data: null, error: null };
  }

  private async execUpdate() {
    const colsSet = await tableColumns(this.table);
    const patch = { ...(this.payload || {}) };
    if (colsSet.has("updated_at") && patch.updated_at === undefined) patch.updated_at = nowIso();
    const keys = Object.keys(patch).filter((k) => colsSet.has(k));
    if (!keys.length) return { data: null, error: null };
    const setSql = keys.map((k) => `${qIdent(k)} = ?`).join(", ");
    const setParams = keys.map((k) => normalizeDbValue(k, patch[k]));
    const { where, params } = buildWhere(this.filters);
    await dbRun(`update ${qIdent(this.table)} set ${setSql} ${where}`.trim(), [...setParams, ...params]);

    if (this.returningCols) {
      const cols = normalizeSelectColumns(this.returningCols);
      const row = await dbFirst<any>(
        `select ${cols} from ${qIdent(this.table)} ${where} limit 1`.trim(),
        params
      );
      if (this.wantSingle && !row) return { data: null, error: { message: "PGRST116" } };
      return { data: row, error: null };
    }

    return { data: null, error: null };
  }

  private async execDelete() {
    const { where, params } = buildWhere(this.filters);
    await dbRun(`delete from ${qIdent(this.table)} ${where}`.trim(), params);
    return { data: null, error: null };
  }

  private async execUpsert() {
    const colsSet = await tableColumns(this.table);
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
    const onConflict = String(this.upsertOptions?.onConflict || "").trim();
    const ignore = Boolean(this.upsertOptions?.ignoreDuplicates);
    const conflictCols = onConflict
      ? onConflict.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    if (!conflictCols.length) {
      throw new Error("Upsert requires onConflict in D1 mode.");
    }

    for (const r of rows) {
      const row = { ...(r || {}) };
      if (colsSet.has("id") && row.id === undefined) row.id = crypto.randomUUID();
      if (colsSet.has("created_at") && row.created_at === undefined) row.created_at = nowIso();
      if (colsSet.has("updated_at") && row.updated_at === undefined) row.updated_at = nowIso();
      if (colsSet.has("requested_at") && row.requested_at === undefined) row.requested_at = nowIso();
      if (colsSet.has("downloaded_at") && row.downloaded_at === undefined) row.downloaded_at = nowIso();
      if (colsSet.has("captured_at") && row.captured_at === undefined) row.captured_at = nowIso();

      const keys = Object.keys(row).filter((k) => colsSet.has(k));
      if (!keys.length) continue;
      const cols = keys.map((k) => qIdent(k)).join(", ");
      const ph = keys.map(() => "?").join(", ");
      const params = keys.map((k) => normalizeDbValue(k, row[k]));
      const conflict = conflictCols.map((c) => qIdent(c)).join(", ");

      if (ignore) {
        await dbRun(
          `insert into ${qIdent(this.table)} (${cols}) values (${ph}) on conflict(${conflict}) do nothing`,
          params
        );
      } else {
        const updateCols = keys.filter((k) => !conflictCols.includes(k));
        const setSql = updateCols.map((k) => `${qIdent(k)} = excluded.${qIdent(k)}`).join(", ");
        await dbRun(
          `insert into ${qIdent(this.table)} (${cols}) values (${ph}) on conflict(${conflict}) do update set ${setSql}`,
          params
        );
      }
    }

    if (this.returningCols) {
      const one = rows.length ? (rows[0] as any) : null;
      if (!one) return { data: null, error: null };
      const cols = normalizeSelectColumns(this.returningCols);
      const whereParts: string[] = [];
      const bind: any[] = [];
      for (const c of conflictCols) {
        if (!isSafeIdent(c)) continue;
        whereParts.push(`${qIdent(c)} = ?`);
        bind.push(one[c]);
      }
      if (!whereParts.length) return { data: null, error: { message: "RETURNING_UNSUPPORTED" } };
      const row = await dbFirst<any>(
        `select ${cols} from ${qIdent(this.table)} where ${whereParts.join(" and ")} limit 1`,
        bind
      );
      if (this.wantSingle && !row) return { data: null, error: { message: "PGRST116" } };
      return { data: row, error: null };
    }

    return { data: null, error: null };
  }
}

export function createD1SupabaseClient() {
  return {
    from(table: string) {
      return new QueryBuilder(table);
    },
    async rpc(name: string, args: any) {
      try {
        if (name === "list_public_files_for_me") {
          const from = Math.max(0, Number(args?._from || 0) || 0);
          const to = Math.max(from, Number(args?._to || from) || from);
          const size = to - from + 1;

          const userId = String(args?._user_id || args?.user_id || "").trim();
          if (!userId) return { data: [], error: null };

          const rows = await dbAll<any>(
            `select
               f.id,
               f.category,
               f.name,
               f.description,
               f.size_bytes,
               f.mime_type,
               f.created_at,
               (p.file_id is not null) as can_download,
               coalesce(r.status, 'none') as request_status,
               r.rejection_reason,
               r.requested_at,
               r.reviewed_at,
               count(*) over() as total_count
             from files f
             left join file_permissions p
               on p.file_id = f.id and p.grantee_profile_id = ?
             left join file_access_requests r
               on r.file_id = f.id and r.user_id = ?
             where f.course_id is null and f.lesson_id is null
             order by f.created_at desc
             limit ? offset ?`,
            [userId, userId, size, from]
          );
          return { data: rows, error: null };
        }
        if (name === "report_student_status_counts") {
          const leaderId = String(args?._leader_id || "").trim();
          if (leaderId) {
            const rows = await dbAll<any>(
              `with recursive tree(id) as (
                 select id from profiles where id = ?
                 union all
                 select p.id from profiles p join tree t on p.leader_id = t.id
               )
               select
                 student_status,
                 cast(count(*) as integer) as total,
                 cast(sum(case when status = 'frozen' then 1 else 0 end) as integer) as frozen
               from profiles
               where role in ('student','trader')
                 and id in (select id from tree)
               group by student_status`,
              [leaderId]
            );
            return { data: rows, error: null };
          }

          const rows = await dbAll<any>(
            `select
               student_status,
               cast(count(*) as integer) as total,
               cast(sum(case when status = 'frozen' then 1 else 0 end) as integer) as frozen
             from profiles
             where role in ('student','trader')
             group by student_status`
          );
          return { data: rows, error: null };
        }
        if (name === "report_course_access_status_counts") {
          const leaderId = String(args?._leader_id || "").trim();
          if (leaderId) {
            const rows = await dbAll<any>(
              `with recursive tree(id) as (
                 select id from profiles where id = ?
                 union all
                 select p.id from profiles p join tree t on p.leader_id = t.id
               )
               select ca.status, cast(count(*) as integer) as total
               from course_access ca
               where ca.user_id in (select id from tree)
               group by ca.status`,
              [leaderId]
            );
            return { data: rows, error: null };
          }

          const rows = await dbAll<any>(
            `select status, cast(count(*) as integer) as total
             from course_access
             group by status`
          );
          return { data: rows, error: null };
        }
        if (name === "report_pending_file_access_requests") {
          const leaderId = String(args?._leader_id || "").trim();
          if (leaderId) {
            const rows = await dbAll<any>(
              `with recursive tree(id) as (
                 select id from profiles where id = ?
                 union all
                 select p.id from profiles p join tree t on p.leader_id = t.id
               )
               select cast(count(*) as integer) as total
               from file_access_requests
               where status = 'requested'
                 and user_id in (select id from tree)`,
              [leaderId]
            );
            return { data: rows, error: null };
          }

          const rows = await dbAll<any>(
            `select cast(count(*) as integer) as total
             from file_access_requests
             where status = 'requested'`
          );
          return { data: rows, error: null };
        }
        if (name === "leader_tree_ids") {
          const root = String(args?.root_id || "").trim();
          const rows = await dbAll<{ id: string }>(
            `with recursive tree(id) as (
              select id from profiles where id = ?
              union all
              select p.id from profiles p join tree t on p.leader_id = t.id
            )
            select id from tree`,
            [root]
          );
          return { data: rows.map((r) => r.id), error: null };
        }
        if (name === "try_job_lock") {
          const job = String(args?._job_name || "").trim();
          const lockSeconds = Number(args?._lock_seconds || 0);
          if (!job || !Number.isFinite(lockSeconds) || lockSeconds <= 0) {
            return { data: false, error: null };
          }
          const now = nowIso();
          const until = new Date(Date.now() + lockSeconds * 1000).toISOString();
          // Acquire lock if not running or expired.
          await dbRun(
            `insert into job_runs (job_name, running, locked_until, last_started_at)
             values (?, true, ?, ?)
             on conflict(job_name) do update set
               running = case when job_runs.locked_until is null or job_runs.locked_until < ? then true else job_runs.running end,
               locked_until = case when job_runs.locked_until is null or job_runs.locked_until < ? then excluded.locked_until else job_runs.locked_until end,
               last_started_at = case when job_runs.locked_until is null or job_runs.locked_until < ? then excluded.last_started_at else job_runs.last_started_at end`,
            [job, until, now, now, now, now]
          );
          const row = await dbFirst<{ running: boolean; locked_until: string | null }>(
            `select running, locked_until from job_runs where job_name = ?`,
            [job]
          );
          const ok = Boolean(row && row.running === true && row.locked_until === until);
          return { data: ok, error: null };
        }
        if (name === "release_job_lock") {
          const job = String(args?._job_name || "").trim();
          const err = args?._error ? String(args._error) : null;
          await dbRun(
            `update job_runs
             set running = false, locked_until = null, last_finished_at = ?, last_error = ?
             where job_name = ?`,
            [nowIso(), err, job]
          );
          return { data: true, error: null };
        }

        return { data: null, error: { message: `Unknown rpc: ${name}` } as any };
      } catch (e: any) {
        return { data: null, error: { message: e?.message ?? "RPC_FAILED" } as any };
      }
    }
  };
}
