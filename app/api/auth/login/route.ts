import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { isAllowedEmail, createSession, handle, HttpError } from "@/lib/auth";
import { query } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Zamanlama farkıyla kullanıcı varlığı sızmasın diye, kullanıcı yoksa da hash karşılaştırılır.
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("demosale-dummy-password", 12));

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const normalized = String(body.email ?? "").trim().toLowerCase();

  // IP başına 20, e-posta başına 8 deneme / 10 dk
  const ipLimit = rateLimit(`login-ip:${clientIp(request)}`, 20, 10 * 60_000);
  const mailLimit = rateLimit(`login-mail:${normalized}`, 8, 10 * 60_000);
  if (!ipLimit.ok || !mailLimit.ok) {
    const retry = Math.max(ipLimit.retryAfter, mailLimit.retryAfter);
    return NextResponse.json(
      { error: `Çok fazla deneme yapıldı. ${Math.ceil(retry / 60)} dakika sonra tekrar deneyin.` },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }

  return handle(async () => {
    if (!isAllowedEmail(normalized)) {
      throw new HttpError(400, "Geçerli bir e-posta adresi girin.");
    }
    const rows = await query<{ id: string; email: string; role: string; full_name: string; password_hash: string }>(
      "SELECT id, email, role, full_name, password_hash FROM users WHERE email = $1",
      [normalized]
    );
    const user = rows[0];
    const ok = await bcrypt.compare(String(body.password ?? ""), user?.password_hash ?? getDummyHash());
    if (!user || !ok) throw new HttpError(401, "E-posta veya şifre hatalı.");

    await createSession(user.id);
    return { user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name } };
  });
}
