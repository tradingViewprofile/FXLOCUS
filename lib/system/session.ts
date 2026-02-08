import "server-only";

import { SignJWT, jwtVerify } from "jose";

import { dbFirst } from "@/lib/db/d1";

const COOKIE_NAME = "fxlocus_session";

type SessionClaims = {
  uid: string;
  sid: string;
};

function mustSecret() {
  const raw = String(process.env.SYSTEM_JWT_SECRET || "").trim();
  if (!raw) throw new Error("Missing env: SYSTEM_JWT_SECRET");
  return new TextEncoder().encode(raw);
}

export function sessionCookieName() {
  return COOKIE_NAME;
}

export async function signSessionCookie(claims: SessionClaims, expiresAt: Date) {
  const secret = mustSecret();
  const exp = Math.floor(expiresAt.getTime() / 1000);
  return await new SignJWT({ uid: claims.uid, sid: claims.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);
}

export async function verifySessionCookie(token: string) {
  const secret = mustSecret();
  const res = await jwtVerify(token, secret);
  const uid = String((res.payload as any)?.uid || "").trim();
  const sid = String((res.payload as any)?.sid || "").trim();
  if (!uid || !sid) return null;
  return { uid, sid };
}

export async function fetchProfileBySession(uid: string, sid: string) {
  const row = await dbFirst<any>(
    `select id,email,full_name,phone,role,leader_id,student_status,status,session_id,session_expires_at
     from profiles
     where id = ?`,
    [uid]
  );
  if (!row?.id) return null;
  if (String(row.session_id || "") !== sid) return null;
  const exp = String(row.session_expires_at || "").trim();
  if (exp && Date.parse(exp) <= Date.now()) return null;
  return row;
}


