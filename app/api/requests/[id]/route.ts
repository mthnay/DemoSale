import { handle, HttpError, requireUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { isUuid } from "@/lib/mappers";

// PATCH { status }
//  - admin: "approved" | "rejected" (reddedilirse stok geri eklenir)
//  - talep sahibi: "cancelled" (kendi bekleyen talebini iptal eder, stok geri eklenir)
// Sadece bekleyen talepler güncellenebilir.
export async function PATCH(request: Request, ctx: RouteContext<"/api/requests/[id]">) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    if (!isUuid(id)) throw new HttpError(404, "Talep bulunamadı.");
    const { status } = await request.json().catch(() => ({}));

    const isAdminAction = status === "approved" || status === "rejected";
    if (!isAdminAction && status !== "cancelled") throw new HttpError(400, "Geçersiz durum.");
    if (isAdminAction && user.role !== "admin") throw new HttpError(403, "Bu işlem için yönetici yetkisi gerekiyor.");

    return transaction(async (client) => {
      const res = await client.query(
        `UPDATE requests SET status = $2, decided_at = now(), decided_by = $3
          WHERE id = $1 AND status = 'pending' ${status === "cancelled" ? "AND user_id = $3" : ""}
          RETURNING device_id`,
        [id, status, user.id]
      );
      if (!res.rows[0]) throw new HttpError(409, "Talep bulunamadı veya zaten sonuçlandırılmış.");
      if (status !== "approved" && res.rows[0].device_id) {
        await client.query("UPDATE devices SET stock = stock + 1, updated_at = now() WHERE id = $1", [
          res.rows[0].device_id,
        ]);
      }
      return { ok: true };
    });
  });
}
