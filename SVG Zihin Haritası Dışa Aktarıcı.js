(function() {
    
    // Toast (bildirim) fonksiyonunu dışarıda tanımlıyoruz ki hem try hem de catch erişebilsin
    // isError = true ise hata, false ise başarı bildirimi gösterir.
    function showToast(message, isError = false) {
        // Hata mesajı çok uzunsa, okunabilir olması için stilini ayarla
        const isLongMessage = message.length > 150;

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '12px 20px';
        toast.style.backgroundColor = isError ? '#D93025' : '#1A73E8'; // Hata (kırmızı) veya Başarı (mavi)
        toast.style.color = 'white';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.zIndex = '10000';
        toast.style.fontFamily = 'Arial, sans-serif';
        toast.style.fontSize = '14px';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.transform = 'translateY(20px)';
        
        // Uzun mesajlar (özellikle bizim çerçeve hatamız) için ayarlar
        if (isLongMessage) {
            toast.style.width = '350px'; // Genişliği ayarla
            toast.style.whiteSpace = 'pre-wrap'; // Yeni satırları (\n) koru
            toast.style.lineHeight = '1.5';
            toast.style.textAlign = 'left';
        }

        document.body.appendChild(toast);

        // Ekrana giriş animasyonu
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // Uzun hata mesajları ekranda daha fazla kalır
        const duration = isError ? (isLongMessage ? 15000 : 5000) : 3000; // 15sn (uzun hata), 5sn (kısa hata), 3sn (başarı)

        // Ekrandan çıkış animasyonu
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => {
                // DOM'dan tamamen kaldır
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    try {
        // --- 1. Düğüm Haritası Oluşturma (Y-Koordinatı ile) ---
        // yToNodeMap: 
        // Anahtar: Y-koordinatı (sayı)
        // Değer: O Y koordinatındaki düğümlerin bir dizisi (Array<Node>)
        // Bu, aynı Y pozisyonundaki farklı derinlikteki (farklı X) düğümleri yönetebilmemizi sağlar.
        const yToNodeMap = new Map();
        const nodes = []; // Tüm düğümlerin listesi

        document.querySelectorAll('g.node').forEach(g => {
            const transform = g.getAttribute('transform');
            // Koordinatları ayıkla: "translate(X, Y)"
            const match = transform ? transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/) : null;
            
            if (!match) return; // Geçerli bir transform verisi yoksa atla

            const x = parseFloat(match[1]); // X koordinatı (derinlik)
            const y = parseFloat(match[2]); // Y koordinatı (dikey pozisyon)

            const textEl = g.querySelector('text.node-name');
            const text = textEl ? textEl.textContent.trim() : '';
            
            // Her düğüm için bir nesne oluştur
            const nodeObj = { id: `x${x}y${y}`, x, y, text, children: [], parent: null };
            nodes.push(nodeObj);
            
            // Düğümü Y-koordinatı haritasına ekle
            if (!yToNodeMap.has(y)) {
                yToNodeMap.set(y, []);
            }
            yToNodeMap.get(y).push(nodeObj);
        });

        // --- AKILLI ÇERÇEVE (FRAME) TESPİTİ ---
        if (nodes.length === 0) {
            // Düğüm bulunamadı. Muhtemelen yanlış çerçevedeyiz.
            
            // Mevcut pencere en üst pencere mi (top)?
            const isTopFrame = (window.self === window.top);
            // 'top' çerçevedeki iframe'leri bul
            const iframes = isTopFrame ? window.top.document.querySelectorAll('iframe') : [];
            
            if (isTopFrame && iframes.length > 0) {
                // Kullanıcıya rehberlik etmek için iframe'lerin listesini çıkar
                let frameNames = [];
                iframes.forEach((frame, i) => {
                    // Iframe için en açıklayıcı ismi bul (id, name veya src'nin bir kısmı)
                    let name = frame.id || frame.name || (frame.src ? frame.src.substring(0, 70) + "..." : `[isimsiz çerçeve ${i+1}]`);
                    frameNames.push(`  • "${name}"`);
                });

                // Kullanıcıyı yönlendiren hata mesajını fırlat
                const message = "HATA: Harita bu çerçevede ('top') bulunamadı.\n\n" +
                                "Muhtemelen aşağıdaki çerçevelerden birindedir:\n" +
                                frameNames.join("\n") + "\n\n" +
                                "Lütfen konsoldaki 'top ▼' menüsünden doğru çerçeveyi seçip kodu tekrar yapıştırın.";
                
                throw new Error(message); // Bu hata 'catch' bloğu tarafından yakalanacak
            
            } else {
                // 'top' değiliz veya iframe yok. Gerçekten düğüm yok.
                throw new Error("Hiç düğüm (node) bulunamadı. Lütfen konsolun doğru çerçeveyi (frame) hedeflediğinden emin olun.");
            }
        }
        // --- KONTROL SONU ---


        // --- 2. Ağaç Yapısını Kurma (Döngü Korumalı) ---
        document.querySelectorAll('path.link').forEach(link => {
            const d = link.getAttribute('d') || '';
            // Çizgi (path) verisindeki tüm sayıları ayıkla
            const coords = d.match(/-?[\d\.]+/g);
            if (!coords || coords.length < 2) return; // Geçersiz çizgi verisi

            // Başlangıç Y (M X Y -> Y)
            const y_start = parseFloat(coords[1]);
            // Bitiş Y (... X Y -> Y)
            const y_end = parseFloat(coords[coords.length - 1]);

            // Başlangıç ve bitiş Y koordinatlarına uyan tüm düğümleri haritadan al
            const startNodes = yToNodeMap.get(y_start) || [];
            const endNodes = yToNodeMap.get(y_end) || [];

            // İki yönlü kontrol yap:
            // X-koordinatı (derinlik) küçük olan ebeveyn, büyük olan çocuktur.
            
            // 1. Olasılık: Start -> End (Başlangıç ebeveyn, Bitiş çocuk)
            for (const parentNode of startNodes) {
                for (const childNode of endNodes) {
                    // X kontrolü VE döngü/yinelenme kontrolü (childNode.parent === null)
                    if (parentNode.x < childNode.x && childNode.parent === null) {
                        parentNode.children.push(childNode);
                        childNode.parent = parentNode;
                        break; // Bu çocuk için ebeveyn bulundu, iç döngüden çık
                    }
                }
            }
             
            // 2. Olasılık: End -> Start (Bitiş ebeveyn, Başlangıç çocuk)
            for (const parentNode of endNodes) {
                 for (const childNode of startNodes) {
                     if (parentNode.x < childNode.x && childNode.parent === null) {
                         parentNode.children.push(childNode);
                         childNode.parent = parentNode;
                         break; // Bu çocuk için ebeveyn bulundu, iç döngüden çık
                     }
                 }
            }
        });

        // --- 3. Çocukları ve Kökleri Sıralama ---
        nodes.forEach(node => {
            // Görsel tutarlılık için çocukları Y-koordinatlarına göre sırala (yukarıdan aşağıya)
            node.children.sort((a, b) => a.y - b.y);
        });

        // --- 4. Kök Düğümleri Bulma ve Sıralama ---
        // Ebeveyni olmayan (parent === null) düğümler köklerdir.
        const roots = nodes.filter(n => n.parent === null);
        // Kökleri de Y-koordinatlarına göre sırala
        roots.sort((a, b) => a.y - b.y); 

        // --- 5. Hiyerarşik Metni Oluşturma ---
        const lines = []; // Çıktı satırlarını tutacak dizi
        
        /**
         * Ağacı özyinelemeli (recursive) olarak dolaşır ve metin satırlarını oluşturur.
         * @param {object} node - İşlenecek düğüm
         * @param {string} prefix - Girinti için kullanılan önek (örn: "│  ")
         * @param {boolean} isLastChild - Bu düğüm, ebeveyninin son çocuğu mu? (Çizgi stilini belirler: └─ veya ├─)
         */
        function buildTreeRecursive(node, prefix = '', isLastChild = true) {
            let line = prefix;
            
            if (prefix) { // Kök düğüm değilse
                // Son çocuksa '└─ ', değilse '├─ ' kullan
                line = prefix.slice(0, -3) + (isLastChild ? '└─ ' : '├─ ');
            }
            
            lines.push(line + node.text); // Metni ekle

            // Alt seviye için yeni önek:
            // Eğer bu son çocuksa (└─), altındaki girinti '   ' (boşluk) olmalı.
            // Eğer son çocuk değilse (├─), altındaki girinti '│  ' (dikey çizgi) olmalı.
            const childPrefix = prefix + (isLastChild ? '   ' : '│  ');
            
            node.children.forEach((child, index) => {
                // Bir sonraki seviyeyi çağır
                buildTreeRecursive(child, childPrefix, index === node.children.length - 1);
            });
        }
        
        // Köklerden başlayarak metin oluşturmayı başlat
        roots.forEach((root, index) => {
            buildTreeRecursive(root, '', index === roots.length - 1);
        });
        
        const output = lines.join('\n'); // Tüm satırları birleştir
        
        if (output.length === 0) {
             throw new Error("Düğümler bulundu ancak hiyerarşi kurulamadı. 'path.link' yapısı beklenenden farklı olabilir.");
        }

        // --- 6. Sonucu İşleme (Konsol, Pano, İndirme) ---
        
        // 6.1. Konsola Yazdır
        console.log('Zihin Haritası (Hiyerarşik Tree):\n' + output);

        // 6.2. Panoya Kopyala
        if (navigator.clipboard) {
            navigator.clipboard.writeText(output).then(
                () => console.log('Hiyerarşik tree çıktısı panoya kopyalandı!'),
                () => console.warn('Panoya kopyalanamadı (Bu normal bir güvenlik uyarısıdır).')
            );
        }

        // 6.3. Dosya Olarak İndir
        // UTF-8 BOM (Byte Order Mark) ekleyerek Windows Not Defteri'nin dosyayı
        // (özellikle Türkçe karakterleri) doğru açmasını sağlıyoruz.
        const blob = new Blob(['\uFEFF' + output], {type: 'text/plain;charset=utf-8'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'zihin_haritasi_hiyerarsik.txt'; // İndirilen dosyanın adı
        document.body.appendChild(a);
        a.click(); // İndirmeyi tetikle
        document.body.removeChild(a); // Temizle

        // 6.4. Başarı Bildirimi Göster
        showToast('Zihin haritası panoya kopyalandı ve indirildi!');

    } catch (error) {
        // Hata yakalandığında (bizim özel yönlendirme hatamız dahil)
        console.error('Zihin haritası çıkarılırken bir hata oluştu:', error.message);
        // Hata mesajını (uzun ve yönlendirici olsa bile) ekranda göster
        showToast(error.message, true);
    }

})();
