import { handle, requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { REQUEST_COLUMNS } from "@/lib/mappers";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const [counts] = await query<{ devices: number; pendingRequests: number; users: number }>(
      `SELECT (SELECT count(*)::int FROM devices) AS devices,
              (SELECT count(*)::int FROM requests WHERE status = 'pending') AS "pendingRequests",
              (SELECT count(*)::int FROM users) AS users`
    );
    const recent = await query(
      `SELECT ${REQUEST_COLUMNS} FROM requests r JOIN users u ON u.id = r.user_id
        ORDER BY r.created_at DESC LIMIT 5`
    );
    return { stats: counts, recent };
  });
}
