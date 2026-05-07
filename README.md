# Spor Toto Tahmin

Mobil öncelikli, Next.js App Router ile hazırlanmış başlangıç Spor Toto tahmin uygulaması.

## Teknolojiler

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- PWA manifest
- npm

## Ekranlar

- `/` ana sayfa
- `/tahminler` 15 maçlık mock tahmin ekranı
- `/sonuclar` sonuç ekranı
- `/puan-tablosu` haftalık sıralama ekranı
- `/profil` misafir profil ekrani

## Kurulum

```bash
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

## Kontroller

```bash
npm run lint --if-present
npm run build
```

## Notlar

- Supabase henüz eklenmedi.
- Harici API henüz eklenmedi.
- Tahmin seçimleri şimdilik yalnızca local React state ile tutulur.
