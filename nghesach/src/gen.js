load('config.js');

function execute(url, page) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    
    if (page && page !== "1") {
        if (url.indexOf("?") !== -1) {
            url = url + "&page=" + page;
        } else {
            url = url + "?page=" + page;
        }
    }
    
    var response = fetch(url);
    if (!response.ok) return null;
    
    var doc = response.html();
    var novels = [];
    var seen = {};
    
    // Approach 1: find all reading links
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
    
    // Approach 2: if no links found, try image-based
    if (novels.length === 0) {
        var imgs = doc.select("img[src*='res.cloudinary.com']");
        for (var i = 0; i < imgs.size(); i++) {
            var img = imgs.get(i);
            var alt = img.attr("alt") || "";
            var src = img.attr("src") || "";
            if (!alt || !src) continue;
            
            var parent = img.parent();
            var href = "";
            while (parent && !href) {
                var a = parent.select("a[href*='/vi/reading/']").first();
                if (a) href = a.attr("href");
                parent = parent.parent();
            }
            
            if (href && !seen[href]) {
                seen[href] = true;
                novels.push({
                    name: alt,
                    link: href,
                    cover: src,
                    description: "",
                    host: BASE_URL
                });
            }
        }
    }
    
    // Pagination
    var next = null;
    var currentPage = page ? parseInt(page) : 1;
    var nextLinks = doc.select("a[href*='page=" + (currentPage + 1) + "']");
    if (nextLinks.size() > 0) {
        next = "" + (currentPage + 1);
    }
    
    return Response.success(novels, next);
}
