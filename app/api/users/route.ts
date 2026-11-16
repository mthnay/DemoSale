import bcrypt from "bcryptjs";
import { isAllowedEmail, handle, HttpError, requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return query(`SELECT id, email, role, created_at AS "createdAt" FROM users ORDER BY created_at DESC`);
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role === "admin" ? "admin" : "user";

    if (!isAllowedEmail(email)) {
      throw new HttpError(400, "Sadece @artitroy.com uzantılı e-posta eklenebilir.");
    }
    if (password.length < 8) throw new HttpError(400, "Şifre en az 8 karakter olmalı.");

    const hash = await bcrypt.hash(password, 12);
    const rows = await query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role, created_at AS "createdAt"`,
      [email, hash, role]
    );
    if (!rows[0]) throw new HttpError(409, "Bu e-posta ile kayıtlı bir kullanıcı zaten var.");
    return rows[0];
  });
}
