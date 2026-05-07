# Spor Toto Tahmin

Mobil öncelikli, Next.js App Router ile hazırlanmış küçük arkadaş grubu Spor Toto tahmin uygulaması.

## Teknolojiler

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- PWA manifest
- Supabase Auth ve veritabanı
- npm

## Ekranlar

- `/` ana sayfa
- `/giris` e-posta ve şifre ile giriş/kayıt ekranı
- `/tahminler` tahmin giriş ekranı ve kapanış sonrası herkesin tahminleri
- `/sonuclar` maç sonuçları ve kullanıcının doğru/yanlış tahminleri
- `/puan-tablosu` haftalık ve sezon puan tablosu
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
5. Admin rolü, admin RLS politikaları ve puan hesaplama RPC fonksiyonu için `supabase/add-admin-role-and-admin-tools.sql` çalıştır.
6. Supabase Auth ayarlarında Email provider'ın açık olduğundan emin ol.

`.env.local` git'e eklenmez. GitHub Actions içinde gerçek Supabase değerleri zorunlu değildir; uygulama build sırasında güvenli placeholder değerlerle derlenebilir.

## Demo Test Akışı

1. `/giris` ekranından kullanıcı oluştur veya giriş yap.
2. `/tahminler` ekranında 15 maç için tahmin yap ve "Tahminleri Kaydet" ile kaydet.
3. Haftayı kapatmak istersen Supabase SQL Editor içinde `supabase/close-demo-week.sql` çalıştır.
4. Demo sonuçlarını girmek ve haftayı kapatmak için `supabase/set-demo-results.sql` çalıştır.
5. Puanları hesaplamak için `supabase/recalculate-demo-scores.sql` çalıştır.
6. `/sonuclar` ekranında maç sonuçlarını ve kendi doğru/yanlış tahminlerini kontrol et.
7. `/puan-tablosu` ekranında haftalık ve sezon puan tablolarını kontrol et.

Puanlar hesaplandıktan sonra `/sonuclar` ekranında "Tüm Sonuçları Gör" bölümü görünür. Bu bölüm haftanın skorlarını düşük puandan yüksek puana doğru animasyonlu şekilde açıklar ve en sonda haftanın kazananını gösterir.

Sonuçları ve puanları temizleyip haftayı tekrar açmak için:

```sql
-- supabase/clear-demo-results.sql
```

Haftayı sadece tekrar tahmine açmak için:

```sql
-- supabase/reopen-demo-week.sql
```

Hafta açıkken `/tahminler` ekranında kullanıcı yalnızca kendi tahminlerini görür. Hafta kapandıktan sonra seçim butonları pasif olur, kayıt butonu gizlenir ve "Herkesin Tahminleri" bölümü görünür.

## Admin Paneli

Kendini admin yapmak için `supabase/make-user-admin.example.sql` dosyasındaki örneği kendi e-posta adresinle düzenleyip Supabase SQL Editor içinde çalıştır.

Admin kullanıcılar alt menüde `/admin` bağlantısını görür. Bu sayfa aktif sezonun son haftası için manuel yönetim sağlar:

- Haftayı kapatır veya tekrar açar.
- Yeni hafta oluşturur.
- Yeni hafta için 15 maçlık listeyi manuel girer.
- Aktif son haftanın ev sahibi, deplasman ve maç zamanı bilgilerini düzenler.
- 15 maç için resmi sonucu `Boş`, `1`, `X`, `2` veya `void` olarak kaydeder.
- `recalculate_scores_for_week` RPC fonksiyonu ile puanları hesaplar.

Uygulama aktif sezon içindeki en yüksek `week_number` değerine sahip haftayı güncel hafta kabul eder. Yeni hafta oluştururken `week_number` önceki haftalardan büyük olursa `/tahminler`, `/sonuclar`, `/puan-tablosu` ve `/admin` bu haftayı kullanır.

Yeni hafta oluşturmak için `/admin` içindeki "Yeni Hafta Oluştur" formunda hafta adı, hafta numarası, tahmin açılış/kapanış zamanı ve 15 maçın ev sahibi/deplasman bilgileri girilir. Maç zamanı isteğe bağlıdır. Oluşturduktan sonra aynı sayfadaki "Aktif Hafta Yönetimi" bölümünden maç listesi manuel olarak güncellenebilir.

Bu panel otomatik Spor Toto importu gelmeden önce manuel yedek yönetim aracı olarak tasarlanmıştır. Service role key kullanılmaz.

## Kontroller

```bash
npm run lint --if-present
npm run build
```

## Notlar

- Harici API henüz eklenmedi.
- Spor Toto veri importu, admin paneli ve otomatik puan hesaplama henüz uygulanmadı.
- Demo puan hesaplama SQL dosyası ile manuel olarak çalıştırılır.
