-- DemoSale şeması (PostgreSQL 16, merkez veritabanı)
-- Tekrar çalıştırılabilir (idempotent).

-- Şema normalde yönetici tarafından oluşturulur (db/setup-role.sql); uygulama rolünün
-- veritabanında CREATE yetkisi olmadığı için yalnızca yoksa oluşturmayı dener.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'demosale') THEN
    CREATE SCHEMA demosale;
  END IF;
END $$;
SET search_path = demosale;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- E-posta kuralı: küçük harf ve geçerli biçim (lib/auth.ts isAllowedEmail ile aynı)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'users_email_check'
       AND pg_get_constraintdef(oid) LIKE '%[:space:]%'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_check;
    ALTER TABLE users ADD CONSTRAINT users_email_check CHECK (
      email = lower(email) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,               -- sha256(çerezdeki token), token düz saklanmaz
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS devices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  price          numeric(12, 2) NOT NULL CHECK (price >= 0),
  battery_health integer NOT NULL DEFAULT 100 CHECK (battery_health BETWEEN 0 AND 100),
  grade          char(1) NOT NULL DEFAULT 'A' CHECK (grade IN ('A', 'B', 'C')),
  warranty       text NOT NULL DEFAULT '',
  category       text NOT NULL DEFAULT 'iPhone',
  stock          integer NOT NULL DEFAULT 1 CHECK (stock >= 0),
  description    text NOT NULL DEFAULT '',
  image_urls     text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS devices_category_idx ON devices(category);

CREATE TABLE IF NOT EXISTS requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    uuid REFERENCES devices(id) ON DELETE SET NULL,
  device_name  text NOT NULL,             -- talep anındaki ad/fiyat (cihaz silinse de kalır)
  device_price numeric(12, 2) NOT NULL,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS requests_user_idx ON requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_status_idx ON requests(status);
CREATE INDEX IF NOT EXISTS requests_created_idx ON requests(created_at DESC);

-- ---------------------------------------------------------------
-- v2: talep notu, karar bilgisi, iptal durumu, kullanıcı adı ve son giriş
-- ---------------------------------------------------------------
ALTER TABLE users    ADD COLUMN IF NOT EXISTS full_name     text NOT NULL DEFAULT '';
ALTER TABLE users    ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

ALTER TABLE requests ADD COLUMN IF NOT EXISTS note       text NOT NULL DEFAULT '';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS decided_at timestamptz;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES users(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'requests_status_check'
       AND pg_get_constraintdef(oid) LIKE '%cancelled%'
  ) THEN
    ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check;
    ALTER TABLE requests ADD CONSTRAINT requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
  END IF;
END $$;

-- Aynı kullanıcı aynı cihaz için aynı anda yalnızca bir bekleyen talep açabilir
CREATE UNIQUE INDEX IF NOT EXISTS requests_one_pending_per_user_device
  ON requests(user_id, device_id) WHERE status = 'pending';
