# Sipariş Pastam — Vercel yayını

Bu paket mevcut uygulamanın Next.js/Vercel sürümüdür. Supabase veritabanı aynı kalır.

## GitHub

Yeni bir özel (Private) repository oluşturun: siparis-pastam. README seçeneğini açabilirsiniz. Add file > Upload files ile bu klasörün İÇİNDEKİ dosya ve klasörleri yükleyin. ZIP dosyasını yüklemeyin. package.json, vercel.json, app ve lib en üst düzeyde bulunmalı.

## Vercel

Vercel > Add New > Project > GitHub repository siparis-pastam > Import.
Framework Preset: Next.js. Root Directory: ./ (package.json bulunduğu dizin).
vercel.json derleme ayarlarını otomatik belirler. Node.js sürümü 24.x seçilebilir.
Environment Variables alanında şu iki değeri Production ortamına ekleyin:

- NEXT_PUBLIC_SUPABASE_URL: Supabase projenizin https://...supabase.co adresi
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Supabase publishable anahtarı

Anahtarları GitHub dosyalarına yazmayın. service_role veya secret key tarayıcı ayarlarına konmaz.
Deploy düğmesine basın. Bağlantı değerleri eksikse derleme açıklayıcı bir hatayla durur. Değerler sonradan değiştirilirse yeniden Deploy gerekir.

Vercel Hobby yalnızca kişisel, ticari olmayan kullanıma açıktır. Pastane işletmesinde kullanım için Pro plan gerekir; güncel fiyat ve kullanım ücretlerini satın alma ekranından kontrol edin. Kaynak: https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage

## Yayın sonrası

Verilen HTTPS adresinde Supabase Authentication bölümünde oluşturduğunuz e-posta ve şifreyle giriş yapın. Yeni bir deneme siparişi oluşturun; ikinci personel oturumunda üretim panosuna geldiğini, iki görseli, durum geçişlerini ve müşteri takip kodunu kontrol edin. Sipariş detayından PDF, ana ekrandan toplu HTML yedek indirin.

Supabase Authentication > URL Configuration altında Site URL olarak yeni Vercel adresinizi kaydedin. Supabase tabloları zaten kurulduysa migration dosyalarını yeniden çalıştırmayın.

Yalnızca giriş yapan aktif personel siparişleri okuyabilir. Müşteri /takip ekranında sipariş numarası + özel kod kullanır. Herkese açık personel kaydı uygulamada yoktur.

## Otomatik silme henüz etkin değil

Teslimden 168 saat sonra silme için supabase/functions/order-retention/index.ts Supabase Edge Functions'a yayımlanmalı; RETENTION_JOB_SECRET ve Vault değerleri ayarlanmalı; ardından supabase/retention-schedule.sql çalıştırılmalı. Bu iş Vercel Cron değildir. Sipariş/çıktı akışı doğrulandıktan sonra kurulacaktır. Açık ve iptal edilen siparişler silinmez. Mevcut teslim edilmiş eski kayıtların yedeğini etkinleştirmeden önce alın.

## Yerel kontrol

Node.js 22.13+; npm ci; .env.example değerlerini .env.local içine doldurun; npm run dev.
Kontroller: npm test ve npm run build.
