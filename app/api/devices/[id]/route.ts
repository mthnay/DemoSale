import { handle, HttpError, requireAdmin, requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { DEVICE_COLUMNS, isUuid } from "@/lib/mappers";
import { parseDeviceInput } from "../validate";

async function deviceId(ctx: RouteContext<"/api/devices/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new HttpError(404, "Cihaz bulunamadı.");
  return id;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/devices/[id]">) {
  return handle(async () => {
    await requireUser();
    const rows = await query(`SELECT ${DEVICE_COLUMNS} FROM devices WHERE id = $1`, [await deviceId(ctx)]);
    if (!rows[0]) throw new HttpError(404, "Cihaz bulunamadı.");
    return rows[0];
  });
}

export async function PUT(request: Request, ctx: RouteContext<"/api/devices/[id]">) {
  return handle(async () => {
    await requireAdmin();
    const d = parseDeviceInput(await request.json().catch(() => ({})), false);
    // Yeni fotoğraf gönderilmediyse mevcut fotoğraflar korunur.
    const rows = await query(
      `UPDATE devices SET name = $2, price = $3, battery_health = $4, grade = $5, warranty = $6,
              category = $7, stock = $8, description = $9,
              image_urls = COALESCE($10, image_urls), updated_at = now()
        WHERE id = $1
        RETURNING ${DEVICE_COLUMNS}`,
      [await deviceId(ctx), d.name, d.price, d.batteryHealth, d.grade, d.warranty, d.category, d.stock,
       d.description, d.imageUrls?.length ? d.imageUrls : null]
    );
    if (!rows[0]) throw new HttpError(404, "Cihaz bulunamadı.");
    return rows[0];
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/devices/[id]">) {
  return handle(async () => {
    await requireAdmin();
    await query("DELETE FROM devices WHERE id = $1", [await deviceId(ctx)]);
    return { ok: true };
  });
}
