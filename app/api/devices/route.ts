import { handle, requireAdmin, requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { DEVICE_COLUMNS } from "@/lib/mappers";
import { parseDeviceInput } from "./validate";

export async function GET() {
  return handle(async () => {
    await requireUser();
    return query(`SELECT ${DEVICE_COLUMNS} FROM devices ORDER BY created_at DESC`);
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin();
    const d = parseDeviceInput(await request.json().catch(() => ({})), true);
    const rows = await query(
      `INSERT INTO devices (name, price, battery_health, grade, warranty, category, stock, description, image_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${DEVICE_COLUMNS}`,
      [d.name, d.price, d.batteryHealth, d.grade, d.warranty, d.category, d.stock, d.description, d.imageUrls ?? []]
    );
    return rows[0];
  });
}
