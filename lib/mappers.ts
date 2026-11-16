import "server-only";

// SQL kolonlarını sayfaların beklediği camelCase alanlara çeviren SELECT listeleri.
export const DEVICE_COLUMNS = `
  id, name, price::float8 AS price, battery_health AS "batteryHealth", grade, warranty,
  category, stock, description, image_urls AS "imageUrls", created_at AS "createdAt"`;

export const REQUEST_COLUMNS = `
  r.id, r.device_id AS "deviceId", r.device_name AS "deviceName",
  r.device_price::float8 AS "devicePrice", r.user_id AS "userId", u.email AS "userEmail",
  r.status, r.note, r.created_at AS "createdAt", r.decided_at AS "decidedAt"`;

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
