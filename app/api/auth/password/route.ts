import bcrypt from "bcryptjs";
import { handle, HttpError, requireUser, revokeUserSessions } from "@/lib/auth";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

// POST { currentPassword, newPassword } — kendi şifresini değiştirir, diğer oturumları kapatır.
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    if (!rateLimit(`pw:${user.id}`, 5, 10 * 60_000).ok) {
      throw new HttpError(429, "Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.");
    }
    const { currentPassword, newPassword } = await request.json().catch(() => ({}));
    const next = String(newPassword ?? "");
    if (next.length < 8) throw new HttpError(400, "Yeni şifre en az 8 karakter olmalı.");

    const [row] = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
    if (!row || !(await bcrypt.compare(String(currentPassword ?? ""), row.password_hash))) {
      throw new HttpError(400, "Mevcut şifre hatalı.");
    }
    await query("UPDATE users SET password_hash = $2 WHERE id = $1", [user.id, await bcrypt.hash(next, 12)]);
    await revokeUserSessions(user.id, true);
    return { ok: true };
  });
}
