import "server-only";
import { Pool, type PoolClient } from "pg";

// Bağlantı: DATABASE_URL (ör. postgresql://troydemosales:***@127.0.0.1:5432/merkez)
// Şema: DB_SCHEMA (varsayılan "troydemosales"), her bağlantıda search_path olarak ayarlanır.
const schema = process.env.DB_SCHEMA || "troydemosales";
if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error("Geçersiz DB_SCHEMA");

const globalForPg = globalThis as unknown as { troyPool?: Pool };

function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL tanımlı değil");
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    options: `-c search_path=${schema}`,
  });
}

// Havuz ilk sorguda oluşturulur; böylece build sırasında DB/ortam değişkeni gerekmez.
function pool(): Pool {
  if (!globalForPg.troyPool) globalForPg.troyPool = createPool();
  return globalForPg.troyPool;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const res = await pool().query(text, params);
  return res.rows as T[];
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
