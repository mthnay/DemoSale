-- Göstermelik cihazları kaldırır (bunlara bağlı talepler korunur, cihaz bağlantısı boşalır).
SET search_path = troydemosales;
DELETE FROM devices WHERE name IN (
  'iPhone 15 Pro 256 GB Natürel Titanyum',
  'iPhone 15 128 GB Pembe',
  'iPhone 14 128 GB Gece Yarısı',
  'iPhone 13 mini 128 GB Mavi',
  'iPhone SE (3. nesil) 64 GB',
  'MacBook Air 13" M3 16 GB / 512 GB Gece Yarısı',
  'MacBook Pro 14" M3 Pro 18 GB / 1 TB',
  'MacBook Air 13" M2 8 GB / 256 GB Yıldız Işığı',
  'iPad Pro 11" M4 256 GB Wi-Fi',
  'iPad Air 11" M2 128 GB Mavi',
  'iPad (10. nesil) 64 GB Sarı',
  'Apple Watch Series 9 45 mm Alüminyum',
  'Apple Watch SE 40 mm Gece Yarısı',
  'Apple Watch Ultra 2 49 mm Titanyum',
  'AirPods Pro (2. nesil) USB-C',
  'AirPods (3. nesil) Lightning',
  'AirPods Max Uzay Grisi',
  'Magic Keyboard (Touch ID) Türkçe Q',
  'MagSafe Şarj Aleti 1 m',
  'Apple Pencil (USB-C)'
);
