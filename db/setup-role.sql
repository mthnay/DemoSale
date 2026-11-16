-- Bir kez, postgres kullanıcısıyla merkez veritabanında çalıştırılır:
--   sudo -u postgres psql -d merkez -v pw="'<şifre>'" -f db/setup-role.sql
-- Ardından şema: DATABASE_URL=... npm run db:migrate

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'troydemosales') THEN
    CREATE ROLE troydemosales LOGIN;
  END IF;
END $$;
ALTER ROLE troydemosales PASSWORD :pw;
CREATE SCHEMA IF NOT EXISTS troydemosales AUTHORIZATION troydemosales;
REVOKE ALL ON SCHEMA troydemosales FROM PUBLIC;
GRANT CONNECT ON DATABASE merkez TO troydemosales;
ALTER ROLE troydemosales SET search_path = troydemosales;
