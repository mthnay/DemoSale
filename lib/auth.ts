import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "./db";

export const SESSION_COOKIE = "troy_session";
const SESSION_DAYS = 30;
export const ALLOWED_DOMAIN = "@artitroy.com";
// Alan adı dışında izin verilen tekil adresler (db/schema.sql'deki kısıtla aynı tutun)
export const EXTRA_ALLOWED_EMAILS = ["mthnay@outlook.com"];
export const isAllowedEmail = (email: string) =>
  email.endsWith(ALLOWED_DOMAIN) || EXTRA_ALLOWED_EMAILS.includes(email);

export type Role = "admin" | "user";
export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    userId,
    expires,
  ]);
  // Süresi dolmuş oturumları temizle, son giriş zamanını yaz
  await query("DELETE FROM sessions WHERE expires_at < now()");
  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [userId]);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await query<SessionUser>(
    `SELECT u.id, u.email, u.role, u.full_name AS "fullName"
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)]
  );
  return rows[0] ?? null;
}

/** Kullanıcının oturumlarını kapatır; exceptCurrent verilirse mevcut oturum korunur. */
export async function revokeUserSessions(userId: string, exceptCurrent = false) {
  let keep: string | null = null;
  if (exceptCurrent) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    keep = token ? hashToken(token) : null;
  }
  await query("DELETE FROM sessions WHERE user_id = $1 AND token_hash IS DISTINCT FROM $2", [userId, keep]);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Oturum açmanız gerekiyor.");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new HttpError(403, "Bu işlem için yönetici yetkisi gerekiyor.");
  return user;
}

/** Route handler gövdesini sarar; HttpError'ları JSON hataya çevirir. */
export async function handle(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const code = (err as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "Bu kayıt zaten mevcut." }, { status: 409 });
    }
    if (code === "23514" || code === "22P02") {
      return NextResponse.json({ error: "Geçersiz veri." }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }
}
