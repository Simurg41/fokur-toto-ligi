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

3. Supabase SQL Editor içinde önce `supabase/schema.sql` dosyasındaki SQL'i çalıştır.
4. Demo sezon, açık hafta ve 15 maç oluşturmak için ardından `supabase/seed-demo-week.sql` dosyasındaki SQL'i çalıştır.
5. Supabase Auth ayarlarında Email provider'ın açık olduğundan emin ol.

`.env.local` git'e eklenmez. GitHub Actions içinde gerçek Supabase değerleri zorunlu değildir; uygulama build sırasında güvenli placeholder değerlerle derlenebilir.

`/tahminler` ekranı aktif haftayı, maçları ve kullanıcının mevcut tahminlerini Supabase'den okur. "Tahminleri Kaydet" butonu seçimleri `predictions` tablosuna upsert ile kaydeder.

## Demo Hafta Testi

Hafta açıkken `/tahminler` ekranında kullanıcı yalnızca kendi tahminlerini görür, 1/X/2 seçimlerini değiştirebilir ve "Tahminleri Kaydet" ile Supabase'e kaydeder.

Haftayı kapatmak ve herkesin tahminlerini görmek için Supabase SQL Editor içinde şunu çalıştır:

```sql
-- supabase/close-demo-week.sql
```

Kapanıştan sonra `/tahminler` ekranında seçim butonları pasif olur, kayıt butonu gizlenir, "Tahmin süresi doldu." mesajı ve "Herkesin Tahminleri" bölümü görünür.

Haftayı yeniden açmak için Supabase SQL Editor içinde şunu çalıştır:

```sql
-- supabase/reopen-demo-week.sql
```

Yeniden açıldıktan sonra tahmin formu tekrar aktif olur ve diğer kullanıcıların tahminleri gösterilmez.

## Kontroller

```bash
npm run lint --if-present
npm run build
```

## Notlar

- Supabase Auth temeli ve RLS şeması eklendi.
- Harici API henüz eklenmedi.
- Tahmin seçimleri Supabase'e kaydedilir; ekranda seçim sırasında local React state kullanılır.
- Spor Toto veri importu ve puan hesaplama henüz uygulanmadı.
