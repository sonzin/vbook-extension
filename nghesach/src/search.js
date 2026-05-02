load('config.js');

function execute(key, page) {
    var url = BASE_URL + "/vi/filter?q=" + encodeURIComponent(key);
    if (page && page !== "1") {
        url = url + "&page=" + page;
    }
    
    var response = fetch(url);
    if (!response.ok) return null;
    
    var doc = response.html();
    var novels = [];
    var seen = {};
    
    var links = doc.select("a[href*='/vi/reading/']");
    for (var i = 0; i < links.size(); i++) {
        var link = links.get(i);
        var href = link.attr("href");
        if (!href) continue;
        if (seen[href]) continue;
        seen[href] = true;
        
        var title = link.text().trim();
        var cover = "";
        var desc = "";
        
        var parent = link.parent();
        if (parent) {
            var img = parent.select("img").first();
            if (!img) {
                var grandparent = parent.parent();
                if (grandparent) img = grandparent.select("img").first();
            }
            if (img) {
                cover = img.attr("src") || img.attr("data-src") || "";
                if (!title) title = img.attr("alt") || "";
            }
            var p = parent.select("p").first();
            if (p) desc = p.text().trim();
        }
        
        if (title) {
            novels.push({
                name: title,
                link: href,
                cover: cover,
                description: desc,
                host: BASE_URL
            });
        }
    }
    
    var next = null;
    var currentPage = page ? parseInt(page) : 1;
    var nextLinks = doc.select("a[href*='page=" + (currentPage + 1) + "']");
    if (nextLinks.size() > 0) {
        next = "" + (currentPage + 1);
    }
    
    return Response.success(novels, next);
}
