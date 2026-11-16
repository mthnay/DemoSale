import { handle, requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { REQUEST_COLUMNS } from "@/lib/mappers";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const [counts] = await query(
      `SELECT (SELECT count(*)::int FROM devices) AS devices,
              (SELECT coalesce(sum(stock), 0)::int FROM devices) AS "unitsInStock",
              (SELECT count(*)::int FROM devices WHERE stock = 0) AS "soldOut",
              (SELECT count(*)::int FROM requests WHERE status = 'pending') AS "pendingRequests",
              (SELECT count(*)::int FROM requests WHERE status = 'approved') AS "approvedRequests",
              (SELECT coalesce(sum(device_price), 0)::float8 FROM requests WHERE status = 'approved') AS "approvedRevenue",
              (SELECT count(*)::int FROM users) AS users`
    );
    const byCategory = await query(
      `SELECT category, count(*)::int AS devices, coalesce(sum(stock), 0)::int AS stock
         FROM devices GROUP BY category ORDER BY devices DESC`
    );
    const last14 = await query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS day, count(r.id)::int AS requests
         FROM generate_series(current_date - 13, current_date, interval '1 day') d
         LEFT JOIN requests r ON r.created_at::date = d::date
        GROUP BY d ORDER BY d`
    );
    const recent = await query(
      `SELECT ${REQUEST_COLUMNS} FROM requests r JOIN users u ON u.id = r.user_id
        ORDER BY r.created_at DESC LIMIT 6`
    );
    return { stats: counts, byCategory, last14, recent };
  });
}
