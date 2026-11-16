-- Bir kez, postgres kullanıcısıyla merkez veritabanında çalıştırılır:
--   sudo -u postgres psql -d merkez -v pw="'<şifre>'" -f db/setup-role.sql
-- Ardından şema: DATABASE_URL=... npm run db:migrate

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'demosale') THEN
    CREATE ROLE demosale LOGIN;
  END IF;
END $$;
ALTER ROLE demosale PASSWORD :pw;
CREATE SCHEMA IF NOT EXISTS demosale AUTHORIZATION demosale;
REVOKE ALL ON SCHEMA demosale FROM PUBLIC;
GRANT CONNECT ON DATABASE merkez TO demosale;
ALTER ROLE demosale SET search_path = demosale;
