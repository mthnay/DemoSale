import { handle, HttpError, requireUser } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { isUuid, REQUEST_COLUMNS } from "@/lib/mappers";

// GET /api/requests          -> admin: tüm talepler, personel: kendi talepleri
// GET /api/requests?mine=1   -> herkes için sadece kendi talepleri
export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const mine = new URL(request.url).searchParams.get("mine") === "1";
    if (mine || user.role !== "admin") {
      return query(
        `SELECT ${REQUEST_COLUMNS} FROM requests r JOIN users u ON u.id = r.user_id
          WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
        [user.id]
      );
    }
    return query(
      `SELECT ${REQUEST_COLUMNS} FROM requests r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC`
    );
  });
}

// POST { deviceId } -> stoğu 1 düşürür ve talebi tek işlemde oluşturur
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { deviceId } = await request.json().catch(() => ({}));
    if (typeof deviceId !== "string" || !isUuid(deviceId)) throw new HttpError(400, "Geçersiz cihaz.");

    return transaction(async (client) => {
      const dev = await client.query(
        `UPDATE devices SET stock = stock - 1, updated_at = now()
          WHERE id = $1 AND stock > 0
          RETURNING name, price, stock`,
        [deviceId]
      );
      if (!dev.rows[0]) throw new HttpError(409, "Bu ürün maalesef tükendi.");
      const { name, price, stock } = dev.rows[0];
      const req = await client.query(
        `INSERT INTO requests (device_id, device_name, device_price, user_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [deviceId, name, price, user.id]
      );
      return { id: req.rows[0].id, stock };
    });
  });
}
