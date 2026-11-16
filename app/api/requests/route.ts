import { handle, HttpError, requireUser } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { isUuid, REQUEST_COLUMNS } from "@/lib/mappers";
import { rateLimit } from "@/lib/rate-limit";

const STATUSES = ["pending", "approved", "rejected", "cancelled"];

// GET /api/requests                 -> admin: tüm talepler, personel: kendi talepleri
// GET /api/requests?mine=1          -> sadece kendi talepleri
// GET /api/requests?status=pending  -> duruma göre filtre
export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const mine = params.get("mine") === "1" || user.role !== "admin";
    const status = params.get("status");

    const where: string[] = [];
    const args: unknown[] = [];
    if (mine) {
      args.push(user.id);
      where.push(`r.user_id = $${args.length}`);
    }
    if (status && STATUSES.includes(status)) {
      args.push(status);
      where.push(`r.status = $${args.length}`);
    }
    return query(
      `SELECT ${REQUEST_COLUMNS} FROM requests r JOIN users u ON u.id = r.user_id
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY r.created_at DESC LIMIT 500`,
      args
    );
  });
}

// POST { deviceId, note? } -> stoğu 1 düşürür ve talebi tek işlemde oluşturur
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    if (!rateLimit(`req:${user.id}`, 10, 60_000).ok) {
      throw new HttpError(429, "Çok hızlı talep oluşturuyorsunuz, biraz bekleyin.");
    }
    const { deviceId, note } = await request.json().catch(() => ({}));
    if (typeof deviceId !== "string" || !isUuid(deviceId)) throw new HttpError(400, "Geçersiz cihaz.");

    return transaction(async (client) => {
      const dup = await client.query(
        "SELECT 1 FROM requests WHERE user_id = $1 AND device_id = $2 AND status = 'pending'",
        [user.id, deviceId]
      );
      if (dup.rowCount) throw new HttpError(409, "Bu cihaz için zaten bekleyen bir talebiniz var.");

      const dev = await client.query(
        `UPDATE devices SET stock = stock - 1, updated_at = now()
          WHERE id = $1 AND stock > 0
          RETURNING name, price, stock`,
        [deviceId]
      );
      if (!dev.rows[0]) throw new HttpError(409, "Bu ürün maalesef tükendi.");
      const { name, price, stock } = dev.rows[0];
      const req = await client.query(
        `INSERT INTO requests (device_id, device_name, device_price, user_id, note)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [deviceId, name, price, user.id, String(note ?? "").trim().slice(0, 500)]
      );
      return { id: req.rows[0].id, stock };
    });
  });
}
