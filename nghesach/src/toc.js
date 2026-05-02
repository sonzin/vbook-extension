load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    
    var response = fetch(url);
    if (!response.ok) return null;
    
    var doc = response.html();
    var rawHtml = doc.html();
    var slug = getSlugFromUrl(url);
    var book = null;
    
    if (slug) {
        book = extractBookFromPage(rawHtml, slug);
    }
    
    var chapters = [];
    
    if (book && book.ebooks && book.ebooks.length > 0) {
        for (var i = 0; i < book.ebooks.length; i++) {
            var ebookUrl = book.ebooks[i];
            var match = ebookUrl.match(/_(\d+)_(\d+)\.epub$/);
            if (match) {
                var start = parseInt(match[1]);
                var end = parseInt(match[2]);
                for (var ch = start; ch <= end; ch++) {
                    chapters.push({
                        name: "Chương " + ch,
                        url: url + "?chapter=" + ch + "&ebook=" + i,
                        host: BASE_URL
                    });
                }
            } else {
                chapters.push({
                    name: "Ebook " + (i + 1),
                    url: ebookUrl,
                    host: BASE_URL
                });
            }
        }
    }
    
    if (chapters.length === 0 && book && book.latestChapter) {
        for (var ch = 1; ch <= book.latestChapter; ch++) {
            chapters.push({
                name: "Chương " + ch,
                url: url + "?chapter=" + ch,
                host: BASE_URL
            });
        }
    }
    
    if (chapters.length === 0) {
        chapters.push({
            name: "Đọc trên website",
            url: url,
            host: BASE_URL
        });
    }
    
    return Response.success(chapters);
}
