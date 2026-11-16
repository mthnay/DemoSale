import bcrypt from "bcryptjs";
import { ALLOWED_DOMAIN, createSession, handle, HttpError } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  return handle(async () => {
    const { email, password } = await request.json().catch(() => ({}));
    const normalized = String(email ?? "").trim().toLowerCase();
    if (!normalized.endsWith(ALLOWED_DOMAIN)) {
      throw new HttpError(400, "Sadece @artitroy.com e-posta adresleri giriş yapabilir.");
    }
    const rows = await query<{ id: string; email: string; role: string; password_hash: string }>(
      "SELECT id, email, role, password_hash FROM users WHERE email = $1",
      [normalized]
    );
    const user = rows[0];
    const ok = user && (await bcrypt.compare(String(password ?? ""), user.password_hash));
    if (!ok) throw new HttpError(401, "E-posta veya şifre hatalı.");

    await createSession(user.id);
    return { user: { id: user.id, email: user.email, role: user.role } };
  });
}
