# Troy Demo Sales

Artı Troy personeli için demo cihaz satış kataloğu (Next.js 16 + PostgreSQL).

## Mimari

- **Veritabanı:** PostgreSQL, `merkez` veritabanında `troydemosales` şeması (`db/schema.sql`).
  Tablolar: `users`, `sessions`, `devices`, `requests`.
- **Kimlik doğrulama:** bcrypt ile hash'lenmiş şifreler + HttpOnly oturum çerezi (`troy_session`).
  Sadece `@artitroy.com` adresleri.
- **API:** `app/api/*` route handler'ları; tüm yetki kontrolleri sunucuda (`lib/auth.ts`).

## Ortam değişkenleri

| Değişken       | Örnek                                                        |
| -------------- | ------------------------------------------------------------ |
| `DATABASE_URL` | `postgresql://troydemosales:***@127.0.0.1:5432/merkez`       |
| `DB_SCHEMA`    | `troydemosales` (varsayılan)                                 |

Build için veritabanı gerekmez; bağlantı ilk istekte açılır.

## Kurulum

```bash
# 1) Rol + şema (bir kez, postgres kullanıcısıyla)
sudo -u postgres psql -d merkez -v pw="'<şifre>'" -f db/setup-role.sql

# 2) Tablolar (tekrar çalıştırılabilir)
DATABASE_URL=... npm run db:migrate

# 3) İlk yönetici (şifre terminalde sorulur)
DATABASE_URL=... npm run user:create -- ad.soyad@artitroy.com admin
```

## Geliştirme

```bash
npm install
DATABASE_URL=... npm run dev
```
