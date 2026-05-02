load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    
    var response = fetch(url);
    if (!response.ok) return null;
    
    var doc = response.html();
    var html = doc.html();
    var slug = getSlugFromUrl(url);
    var book = null;
    
    if (slug) {
        book = findBookObject(html, slug);
    }
    
    if (book) {
        var name = book.name || "";
        var cover = "";
        if (book.coverImage && book.coverImage.url) {
            cover = book.coverImage.url;
        }
        var author = "";
        if (book.author && book.author.name) {
            author = book.author.name;
        }
        var description = book.description || "";
        
        var genres = [];
        if (book.categories) {
            for (var i = 0; i < book.categories.length; i++) {
                genres.push({
                    title: book.categories[i],
                    input: "/vi/all?category=" + book.categories[i],
                    script: "gen.js"
                });
            }
        }
        
        var detail = [];
        if (book.latestChapter) {
            detail.push("Chương mới nhất: " + book.latestChapter);
        }
        if (book.latestTitle) {
            detail.push("Tên chương mới nhất: " + book.latestTitle);
        }
        if (book.ebooks && book.ebooks.length > 0) {
            detail.push("Có " + book.ebooks.length + " ebook");
        }
        
        var ongoing = true;
        if (book.latestTitle) {
            var lt = book.latestTitle.toLowerCase();
            if (lt.indexOf("hoàn") !== -1 || lt.indexOf("full") !== -1 || lt.indexOf("kết thúc") !== -1) {
                ongoing = false;
            }
        }
        
        return Response.success({
            name: name,
            cover: cover,
            author: author,
            description: description,
            detail: detail.join("<br>"),
            host: BASE_URL,
            genres: genres,
            ongoing: ongoing
        });
    }
    
    // Fallback: parse visible HTML
    var name = getTitleFromDoc(doc);
    var cover = getCoverFromDoc(doc);
    var description = getDescriptionFromDoc(doc);
    
    return Response.success({
        name: name,
        cover: cover,
        author: "",
        description: description,
        detail: "",
        host: BASE_URL,
        genres: [],
        ongoing: true
    });
}
