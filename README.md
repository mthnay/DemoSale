# DemoSale

Personel için demo ve teşhir cihazları satış kataloğu (Next.js 16 + PostgreSQL).

## Mimari

- **Veritabanı:** PostgreSQL, `merkez` veritabanında `demosale` şeması (`db/schema.sql`).
  Tablolar: `users`, `sessions`, `devices`, `requests`. Şema her `npm start`'ta otomatik güncellenir.
- **Kimlik doğrulama:** bcrypt ile hash'lenmiş şifreler + HttpOnly oturum çerezi (`ds_session`).
  Hesapları yalnızca yöneticiler açar; giriş denemeleri sınırlandırılır.
- **API:** `app/api/*` route handler'ları; tüm yetki kontrolleri sunucuda (`lib/auth.ts`).
  `proxy.ts` oturumsuz ziyaretçileri giriş sayfasına yönlendirir.

## Ortam değişkenleri

| Değişken       | Örnek                                                   |
| -------------- | ------------------------------------------------------- |
| `DATABASE_URL` | `postgresql://demosale:***@127.0.0.1:5432/merkez`       |
| `DB_SCHEMA`    | `demosale` (varsayılan)                                 |

Build için veritabanı gerekmez; bağlantı ilk istekte açılır.

## Kurulum

```bash
# 1) Rol + şema (bir kez, postgres kullanıcısıyla)
sudo -u postgres psql -d merkez -v pw="'<şifre>'" -f db/setup-role.sql

# 2) Tablolar (npm start bunu zaten yapar)
DATABASE_URL=... npm run db:migrate

# 3) İlk yönetici (şifre terminalde gizli sorulur)
DATABASE_URL=... npm run user:create -- ad.soyad@sirket.com admin

# İsteğe bağlı: göstermelik cihazlar / kaldırma
psql ... -f db/demo-seed.sql
psql ... -f db/demo-remove.sql
```

## Geliştirme

```bash
npm install
DATABASE_URL=... npm run dev
```
