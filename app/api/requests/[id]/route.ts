import { handle, HttpError, requireAdmin } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { isUuid } from "@/lib/mappers";

// PATCH { status: "approved" | "rejected" } — sadece bekleyen talepler güncellenir.
// Reddedilen talepte stok geri eklenir.
export async function PATCH(request: Request, ctx: RouteContext<"/api/requests/[id]">) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await ctx.params;
    if (!isUuid(id)) throw new HttpError(404, "Talep bulunamadı.");
    const { status } = await request.json().catch(() => ({}));
    if (status !== "approved" && status !== "rejected") throw new HttpError(400, "Geçersiz durum.");

    return transaction(async (client) => {
      const res = await client.query(
        `UPDATE requests SET status = $2 WHERE id = $1 AND status = 'pending' RETURNING device_id`,
        [id, status]
      );
      if (!res.rows[0]) throw new HttpError(409, "Talep bulunamadı veya zaten sonuçlandırılmış.");
      if (status === "rejected" && res.rows[0].device_id) {
        await client.query("UPDATE devices SET stock = stock + 1, updated_at = now() WHERE id = $1", [
          res.rows[0].device_id,
        ]);
      }
      return { ok: true };
    });
  });
}
