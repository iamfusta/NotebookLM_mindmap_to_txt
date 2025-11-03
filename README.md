# NotebookLM_mindmap_to_txt
Bu JavaScript betiği (script), karmaşık SVG tabanlı zihin haritalarını (özellikle Google NotebookLM gibi araçlarda bulunanları) analiz eder ve bunları hiyerarşik olarak düzgün girintilenmiş bir .txt dosyasına aktarır.
Sorun (The Problem)

NotebookLM gibi modern web uygulamaları, zihin haritaları gibi içerikleri genellikle ana sayfadan izole edilmiş <iframe> (iç çerçeve) elemanları içinde yükler. Bu durum, basit "bookmarklet" veya kod parçacıklarının çalışmasını engeller:

Güvenlik Kısıtlamaları (CORS): Ana sayfada (top çerçeve) çalışan bir kodun, notebooklm.google.com gibi farklı bir alandan (origin) yüklenen bir çerçevenin içine girmesi ve oradaki veriyi (düğümleri, çizgileri) okuması güvenlik nedeniyle yasaktır.

Yanlış Çerçeve (Frame) Hedeflemesi: Bir kullanıcı F12 ile konsolu açtığında, konsol varsayılan olarak top çerçeveyi hedefler. Kodu buraya yapıştırmak, zihin haritasının verileri top çerçevede olmadığı için "Düğüm bulunamadı" hatasıyla sonuçlanır.

Çözüm: Akıllı Hata Yönetimi

Bu betik, teknik bilgisi olmayan kullanıcıların bile bu "çerçeve" sorununu aşabilmesi için tasarlanmıştır.

Kullanıcı kodu kopyalayıp (yanlışlıkla) top çerçevedeki konsola yapıştırırsa, betik sadece çökmekle kalmaz. top çerçevede olduğunu anlar, sayfadaki tüm iframe'leri tarar ve kullanıcıya şöyle bir hata bildirimi gösterir:

HATA: Harita bu çerçevede ('top') bulunamadı.
Muhtemelen aşağıdaki çerçevelerden birindedir:
• "notebooklm.google.com..."
• "app (app)..."

Lütfen konsoldaki 'top ▼' menüsünden doğru çerçeveyi seçip kodu tekrar yapıştırın.

Bu yönlendirme sayesinde kullanıcı, hatanın kendisinde değil, kodu çalıştırdığı yerde olduğunu anlar ve doğru çerçeveyi seçerek işlemi tamamlayabilir.

Nasıl Kullanılır?

Zihin haritasının bulunduğu web sayfasını açın.

Geliştirici Araçları'nı açın (Windows/Linux'ta F12 veya Ctrl+Shift+I, Mac'te Cmd+Opt+I).

Console (Konsol) sekmesine tıklayın.

Konsol komut satırının hemen üstündeki açılır menüyü kontrol edin. Genellikle varsayılan olarak top seçilidir.

Bu export_mindmap.js dosyasının içeriğinin tamamını kopyalayıp konsola yapıştırın ve Enter'a basın.

Eğer top çerçevedeyseniz: Ekranda kırmızı bir hata bildirimi (HATA: Harita bu çerçevede ('top') bulunamadı...) çıkacaktır.

Bu hatadaki listeden ilgili çerçeveyi (örn: notebooklm.google.com) top ▼ menüsünden seçin.

Kodu tekrar konsola yapıştırın ve Enter'a basın.

İşlem başarılı olduğunda, zihin_haritasi_hiyerarsik.txt dosyası otomatik olarak inecek ve ekranda mavi bir "Başarılı!" bildirimi görünecektir.

Teknik Detaylar (Kod Nasıl Çalışır?)

showToast(message, isError): Sayfayı engellemeyen (non-blocking) bildirimler göstermek için kullanılan bir yardımcı fonksiyondur. Uzun hata mesajlarını (özellikle çerçeve yönlendirmesi) destekler.

try...catch: Tüm mantığı kapsar, böylece herhangi bir hata (beklenen veya beklenmeyen) kullanıcıya bildirim olarak gösterilir.

Adım 1: Düğüm Toplama ve Haritalama:

querySelectorAll('g.node') ile tüm düğüm gruplarını bulur.

transform özniteliğini (attribute) ayrıştırarak her düğümün x (derinlik) ve y (dikey konum) koordinatlarını alır.

Kritik Mantık: Düğümleri yToNodeMap adlı bir Map nesnesinde saklar. Anahtar y koordinatıdır, değer ise o y koordinatındaki düğümlerin bir dizisidir (Array<Node>). Bu, aynı dikey hizada (aynı y) ama farklı derinliklerde (farklı x) bulunan düğümleri (örn: "İklim Değişikliği" ve "Moldova'da İklim Riskleri") doğru yönetmemizi sağlar.

Adım 2: Akıllı Çerçeve Tespiti: nodes.length === 0 ise (düğüm bulunamadıysa), window.self === window.top kontrolü ve iframe taraması yaparak kullanıcıyı yönlendiren o özel hatayı fırlatır.

Adım 3: Ağaç Yapısını Kurma:

querySelectorAll('path.link') ile tüm bağlantı çizgilerini bulur.

Her çizginin d özniteliğini ayrıştırarak y_start (başlangıç Y) ve y_end (bitiş Y) koordinatlarını çıkarır.

Bu y değerlerini kullanarak yToNodeMap'ten potansiyel ebeveyn ve çocuk düğümleri alır.

parentNode.x < childNode.x karşılaştırmasıyla hangi düğümün ebeveyn (daha küçük X), hangisinin çocuk (daha büyük X) olduğunu belirler.

Döngü ve Yinelenme Koruması: childNode.parent === null kontrolü, bir çocuğa sadece bir kez ebeveyn atanmasını sağlar. Bu, yinelenen çıktıları ve sonsuz döngü hatalarını (Maximum call stack exceeded) engeller.

Adım 4: Metin Oluşturma:

Ebeveyni olmayan (parent === null) düğümleri "kök" olarak belirler.

buildTreeRecursive adlı özyinelemeli (recursive) bir fonksiyon, bu köklerden başlayarak tüm ağacı dolaşır.

Düğümün ebeveyninin son çocuğu olup olmamasına (isLastChild) göre └─  (son) veya ├─  (ara) girinti karakterlerini belirler.

Adım 5: Dışa Aktarma:

Tüm metin satırları (lines) birleştirilir.

new Blob(...) ile bir dosya oluşturulur.

\uFEFF (BOM - Byte Order Mark): Metnin başına bu karakter eklenir. Bu, Windows Not Defteri gibi bazı metin düzenleyicilerin dosyayı (özellikle Türkçe karakterleri) UTF-8 olarak doğru tanımasını sağlar ve "boş dosya" veya "bozuk karakter" sorunlarını çözer.

Görünmez bir <a> linki oluşturulur ve indirme otomatik olarak tetiklenir.
