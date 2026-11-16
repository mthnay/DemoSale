import bcrypt from "bcryptjs";
import { isAllowedEmail, handle, HttpError, requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

const USER_COLUMNS = `id, email, role, full_name AS "fullName", created_at AS "createdAt", last_login_at AS "lastLoginAt"`;

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return query(`SELECT ${USER_COLUMNS} FROM users ORDER BY created_at DESC`);
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim().slice(0, 80);
    const role = body.role === "admin" ? "admin" : "user";

    if (!isAllowedEmail(email)) {
      throw new HttpError(400, "Sadece @artitroy.com uzantılı e-posta eklenebilir.");
    }
    if (password.length < 8) throw new HttpError(400, "Şifre en az 8 karakter olmalı.");

    const rows = await query(
      `INSERT INTO users (email, password_hash, role, full_name) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING ${USER_COLUMNS}`,
      [email, await bcrypt.hash(password, 12), role, fullName]
    );
    if (!rows[0]) throw new HttpError(409, "Bu e-posta ile kayıtlı bir kullanıcı zaten var.");
    return rows[0];
  });
}
