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
- `/profil` profil, görünen ad düzenleme ve çıkış ekranı

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

## Spor Toto Liste İçe Aktarma

`/admin` içindeki "Spor Toto Listesi İçe Aktar" bölümü 15 maçlık listeyi önce önizler, yalnızca admin onaylarsa yeni hafta olarak kaydeder. Bu akış yanlış veri girişine karşı bilinçli bir kontrol adımı sağlar.

Desteklenen yapıştırma formatı satır başına noktalı virgül ile ayrılmıştır:

```text
1;Galatasaray;Fenerbahçe;2026-05-08T20:00
2;Beşiktaş;Trabzonspor;2026-05-09T19:00
3;Samsunspor;Konyaspor
```

Her satır `pozisyon;ev sahibi;deplasman;maç zamanı` biçimindedir. Maç zamanı isteğe bağlıdır, ancak varsa geçerli bir tarih olmalıdır. Liste tam 15 geçerli maç içermelidir.

### Resmî API ile Önizleme

Admin panelindeki "Resmî API’den Liste Çek" alanı `gameRoundId` ile resmî maç listesini önizler. Kullanılan endpoint biçimi:

```text
https://webapi.sportoto.gov.tr/api/GameMatch/GetGameMatches/?gameRoundId={gameRoundId}
```

Örnek:

```text
https://webapi.sportoto.gov.tr/api/GameMatch/GetGameMatches/?gameRoundId=1512
```

`gameRoundId` bulmak için tarayıcıda resmî Spor Toto sayfasını açıp DevTools Network sekmesinde `GetGameMatches` isteğini arayabilirsin. İstek URL'sindeki `gameRoundId` değerini `/admin` içindeki alana girip "Resmî Listeden Önizle" butonuna bas.

Admin panelindeki "Yayınlanmış Haftaları Getir" alanı sezon yılına göre resmî yayınlanmış haftaları listeler. Varsayılan sezon yılı `2025/2026` değeridir. Bir hafta seçildiğinde hem maç listesi hem de sonuç importu için `gameRoundId` alanları doldurulur; admin yine de önizleme ve onay adımlarını kullanır. İstersen `gameRoundId` alanlarını manuel yazmaya devam edebilirsin.

Yayınlanmış hafta listesi için kullanılan endpoint:

```text
https://webapi.sportoto.gov.tr/api/GameRound?year=2025%2F2026&isPublished=true
```

Endpoint sabiti `app/api/spor-toto/rounds/route.ts` içindedir. Resmî yol değişirse bu sabit güncellenebilir.

Bu işlem veritabanına otomatik yazmaz. Admin önce 15 maçlık listeyi önizler, hafta adı/numarası ve tahmin zamanlarını kontrol eder, sonra "Önizlenen Listeyle Hafta Oluştur" ile onaylarsa kayıt yapılır. Bu önizleme/onay adımı yanlış veri girişine karşı bilinçli olarak korunmuştur.

Resmî API uç noktası ileride değişebilir; böyle bir durumda `app/api/spor-toto/matches` ve parser güncellenmelidir. Resmî sonuç importu, cron veya otomatik mevcut hafta tespiti henüz yoktur.

### Resmî Sonuç Önizleme

Admin panelindeki "Resmî Sonuçları İçe Aktar" alanı aynı `gameRoundId` ile resmî sonuçları önizler. Maç listesi ve maç sonuçları aynı endpoint üzerinden okunur:

```text
https://webapi.sportoto.gov.tr/api/GameMatch/GetGameMatches/?gameRoundId={gameRoundId}
```

Örnek:

```text
https://webapi.sportoto.gov.tr/api/GameMatch/GetGameMatches/?gameRoundId=1512
```

`gameRoundId` bulmak için DevTools Network sekmesinde `GetGameMatches?gameRoundId=1512` benzeri isteği arayabilirsin. `/admin` içinde "Resmî Sonuçları Önizle" butonu sonuçları getirir, aktif haftadaki maçlarla pozisyona göre eşleştirir ve uyarıları gösterir.

`GetGameResultByGameRoundId?id=1512` endpointi 1/X/2 maç sonucu değil, ödül/ikramiye bilgisi döndürür. Bu yüzden sonuç importunda kullanılmaz. Maçlar oynandıktan sonra `GetGameMatches` yanıtında `match.fullTimeWin` ve `match.score.homeRegular / awayRegular` alanları dolduğunda sonuçlar okunabilir.

Sonuçlar otomatik uygulanmaz. Admin her sonucu `Boş`, `1`, `X`, `2` veya `void` olarak düzenleyebilir ve yalnızca "Resmî Sonuçları Uygula" butonuyla aktif haftaya yazar. Puanlar otomatik hesaplanmaz; sonuçları uyguladıktan sonra "Puanları Hesapla" butonuna basmak gerekir.

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
