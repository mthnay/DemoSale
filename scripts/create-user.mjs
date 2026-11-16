// Kullanıcı oluşturur veya şifresini/rolünü günceller (ilk admin için).
// Kullanım: DATABASE_URL=... npm run user:create -- <email> <admin|user>
// Şifre terminalde sorulur (komut geçmişine düşmez).
import { createInterface } from "node:readline/promises";
import bcrypt from "bcryptjs";
import pg from "pg";

const [emailArg, roleArg = "user"] = process.argv.slice(2);
const email = String(emailArg ?? "").trim().toLowerCase();
const EXTRA_ALLOWED_EMAILS = ["mthnay@outlook.com"];
if (!(email.endsWith("@artitroy.com") || EXTRA_ALLOWED_EMAILS.includes(email)) || !["admin", "user"].includes(roleArg)) {
  console.error("Kullanım: npm run user:create -- <ad@artitroy.com> <admin|user>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL tanımlı değil");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question("Şifre (en az 8 karakter): ");
rl.close();
if (password.length < 8) {
  console.error("Şifre en az 8 karakter olmalı.");
  process.exit(1);
}

const schema = process.env.DB_SCHEMA || "troydemosales";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  options: `-c search_path=${schema}`,
});
await client.connect();
try {
  const hash = await bcrypt.hash(password, 12);
  await client.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [email, hash, roleArg]
  );
  console.log(`Kullanıcı hazır: ${email} (${roleArg})`);
} finally {
  await client.end();
}
