import bcrypt from "bcryptjs";
import { handle, HttpError, requireAdmin, revokeUserSessions } from "@/lib/auth";
import { query } from "@/lib/db";
import { isUuid } from "@/lib/mappers";

async function targetId(ctx: RouteContext<"/api/users/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new HttpError(404, "Kullanıcı bulunamadı.");
  return id;
}

async function ensureNotLastAdmin(id: string) {
  const [row] = await query<{ admins: number; isAdmin: boolean }>(
    `SELECT (SELECT count(*)::int FROM users WHERE role = 'admin') AS admins,
            EXISTS (SELECT 1 FROM users WHERE id = $1 AND role = 'admin') AS "isAdmin"`,
    [id]
  );
  if (row?.isAdmin && row.admins <= 1) throw new HttpError(409, "Son yönetici kaldırılamaz.");
}

// PATCH { role?, fullName?, password? } — admin; kendi rolünü düşüremez.
export async function PATCH(request: Request, ctx: RouteContext<"/api/users/[id]">) {
  return handle(async () => {
    const admin = await requireAdmin();
    const id = await targetId(ctx);
    const body = await request.json().catch(() => ({}));

    if (body.role !== undefined) {
      if (body.role !== "admin" && body.role !== "user") throw new HttpError(400, "Geçersiz rol.");
      if (body.role === "user") {
        if (id === admin.id) throw new HttpError(400, "Kendi yönetici yetkinizi kaldıramazsınız.");
        await ensureNotLastAdmin(id);
      }
      await query("UPDATE users SET role = $2 WHERE id = $1", [id, body.role]);
    }
    if (body.fullName !== undefined) {
      await query("UPDATE users SET full_name = $2 WHERE id = $1", [id, String(body.fullName).trim().slice(0, 80)]);
    }
    if (body.password !== undefined) {
      const pw = String(body.password);
      if (pw.length < 8) throw new HttpError(400, "Şifre en az 8 karakter olmalı.");
      await query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, await bcrypt.hash(pw, 12)]);
      await revokeUserSessions(id);
    }
    const [row] = await query(
      `SELECT id, email, role, full_name AS "fullName", created_at AS "createdAt", last_login_at AS "lastLoginAt"
         FROM users WHERE id = $1`,
      [id]
    );
    if (!row) throw new HttpError(404, "Kullanıcı bulunamadı.");
    return row;
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/users/[id]">) {
  return handle(async () => {
    const admin = await requireAdmin();
    const id = await targetId(ctx);
    if (id === admin.id) throw new HttpError(400, "Kendi hesabınızı silemezsiniz.");
    await ensureNotLastAdmin(id);
    await query("DELETE FROM users WHERE id = $1", [id]);
    return { ok: true };
  });
}
