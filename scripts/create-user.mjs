// Kullanıcı oluşturur veya şifresini/rolünü günceller (ilk admin için).
// Kullanım: DATABASE_URL=... npm run user:create -- <email> <admin|user>
// Şifre terminalde gizli sorulur (ekranda ve komut geçmişinde görünmez).
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

// Şifreyi ekrana yansıtmadan okur (TTY değilse stdin'den tek satır okur).
async function askHidden(prompt) {
  if (!process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin });
    const line = await new Promise((resolve) => rl.once("line", resolve).once("close", () => resolve("")));
    rl.close();
    return line;
  }
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    let value = "";
    const stdin = process.stdin;
    const finish = (result) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      process.stdout.write("\n");
      resolve(result);
    };
    const onData = (buf) => {
      for (const ch of buf.toString("utf8")) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") return finish(value);
        if (ch === "\u0003") { process.stdout.write("\n"); process.exit(130); } // Ctrl+C
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1); // Backspace
        else if (ch >= " ") value += ch;
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

const password = await askHidden("Şifre (en az 8 karakter, ekranda görünmez): ");
if (password.length < 8) {
  console.error("Şifre en az 8 karakter olmalı.");
  process.exit(1);
}
if (process.stdin.isTTY) {
  const again = await askHidden("Şifre (tekrar): ");
  if (again !== password) {
    console.error("Şifreler eşleşmiyor.");
    process.exit(1);
  }
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
