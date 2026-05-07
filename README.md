# Spor Toto Tahmin

Mobil öncelikli, Next.js App Router ile hazırlanmış başlangıç Spor Toto tahmin uygulaması.

## Teknolojiler

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- PWA manifest
- Supabase Auth ve veritabanı temeli
- npm

## Ekranlar

- `/` ana sayfa
- `/giris` e-posta ve şifre ile giriş/kayıt ekranı
- `/tahminler` 15 maçlık mock tahmin ekranı
- `/sonuclar` sonuç ekranı
- `/puan-tablosu` haftalık sıralama ekranı
- `/profil` profil ve çıkış ekranı

## Kurulum

```bash
npm install
npm run lint --if-present
npm run build
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

## Supabase Kurulumu

1. `.env.example` dosyasını örnek alarak `.env.local` oluştur.
2. Supabase proje değerlerini ekle:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

3. Supabase SQL Editor içinde `supabase/schema.sql` dosyasındaki SQL'i çalıştır.
4. Supabase Auth ayarlarında Email provider'ın açık olduğundan emin ol.

`.env.local` git'e eklenmez. GitHub Actions içinde gerçek Supabase değerleri zorunlu değildir; uygulama build sırasında güvenli placeholder değerlerle derlenebilir.

## Kontroller

```bash
npm run lint --if-present
npm run build
```

## Notlar

- Supabase Auth temeli ve RLS şeması eklendi.
- Harici API henüz eklenmedi.
- Tahmin seçimleri şimdilik yalnızca local React state ile tutulur.
- Spor Toto veri importu ve puan hesaplama henüz uygulanmadı.
