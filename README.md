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


## Kısa takip kodu ve kayıttan önce görsel seçimi güncellemesi

Önce bu paketin içindeki dosyaları mevcut GitHub deposunun köküne yükleyip Commit changes yapın. Vercel'de yeni yayın Ready olunca Supabase SQL Editor'da yeni sorgu açıp yalnızca supabase/migrations/004_short_tracking.sql dosyasını çalıştırın. 001/002/003 dosyalarını mevcut projede yeniden çalıştırmayın. Bu migration siparişleri silmez; tekrar çalıştırıldığında mevcut kısa kodları değiştirmez.

Takip kodları 8 karakterdir (örnek A7C92F40). Mevcut siparişlere de kısa kod atanır; eski 32 karakterli kodlar geçerliliğini korur. Müşteri sipariş numarası ve kodu birlikte girer; büyük/küçük harf fark etmez. Bir sipariş için 15 dakikalık pencerede 10 hatalı denemeden sonra o pencere bitene kadar doğru kod dahil sorgular durur. Sayaç sunucudadır; başka tarayıcıyla aşılamaz. Siparişin varlığı veya müşteri bilgileri hatalı sorguda açıklanmaz. Numara bazlı koruma nedeniyle üçüncü kişiler bilinen bir siparişin takibini geçici olarak kısıtlayabilir.

Yeni sipariş formunda iki isteğe bağlı görsel kayıttan önce seçilir, önizlenir ve kaldırılabilir. Siparişi oluştur düğmesi önce siparişi, sonra görselleri kaydeder. Bu iki hizmet tek veritabanı işlemi değildir: görsel yüklemesi başarısız olursa sipariş korunur; bekleyen dosyalar açık pencerede kalır ve Bekleyen görselleri yeniden yükle ile tekrar denenir. Bu düğme yeni sipariş oluşturmaz. Ağ yanıtı kaybolduğu halde dosya kaydedilmişse aynı içerik tanınır; başka bir görselin üzerine yazılmaz. Pencereyi kapatırken bekleyen dosyalar için uyarı gösterilir. Kapatınca yüklenmemiş dosyaları yeniden seçmek gerekir. Yüklenmiş görseller değişmeden kalır.

Yayın sonrası kontrol: yeni siparişte iki görsel seçin, birini kaldırıp yeniden seçin, siparişi oluşturun ve tek sipariş numarasıyla iki görseli doğrulayın. Takip ekranında kısa kodu ve daha önce verilmiş uzun kodu deneyin. Bu güncelleme otomatik silme görevini etkinleştirmez.
