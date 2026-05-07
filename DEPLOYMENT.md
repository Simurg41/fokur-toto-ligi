# Deployment

Bu doküman ilk Vercel yayını için kısa kontrol listesidir.

## Vercel Adımları

1. Repoyu GitHub'a push et.
2. Vercel'de **Add New Project** ile repoyu seç.
3. Framework olarak Next.js otomatik algılanır.
4. Build command: `npm run build`
5. Install command: `npm install`
6. Deploy etmeden önce environment variable değerlerini ekle.

## Ortam Değişkenleri

Vercel Project Settings > Environment Variables alanına şunları ekle:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`.env.local` yerel geliştirme içindir ve git'e eklenmemelidir.

## Supabase Auth Ayarları

Supabase Dashboard > Authentication > URL Configuration alanında:

- Site URL: Vercel production adresi, örn. `https://spor-toto-tahmin.vercel.app`
- Redirect URLs:
  - `https://spor-toto-tahmin.vercel.app/**`
  - Geliştirme için `http://localhost:3000/**`

E-posta/şifre girişi için Email provider açık olmalıdır.

## PWA Mobil Test

1. Vercel production adresini mobil tarayıcıda aç.
2. Giriş yap ve ana sayfaların yüklendiğini kontrol et.
3. Tarayıcı menüsünden ana ekrana ekle.
4. Ana ekrandan açıldığında standalone görünüm, tema rengi ve ikonun doğru çalıştığını kontrol et.

## Son Kontrol

Deploy öncesi yerelde çalıştır:

```bash
npm install
npm run lint --if-present
npm run build
```
