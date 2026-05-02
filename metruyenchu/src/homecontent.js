load('config.js');

function execute(input, page) {
    let url = BASE_URL;
    
    if (input === "hot") {
        url = BASE_URL + "/danh-sach/truyen-hot";
        if (page) url += "?page=" + page;
    } else if (input === "completed") {
        url = BASE_URL + "/danh-sach/truyen-full";
        if (page) url += "?page=" + page;
    }
    
    let response = fetch(url);
    if (!response.ok) return null;
    
    let doc = response.html();
    let novelList = [];
    
    if (input === "hot" || input === "completed") {
        doc.select(".truyen-list .item").forEach(function(e) {
            let titleEl = e.select("h3 a").first();
            if (!titleEl) return;
            
            let name = titleEl.text().trim();
            let link = titleEl.attr("href");
            if (!name || !link) return;
            
            let cover = "";
            let coverEl = e.select(".cover img").first();
            if (coverEl) {
                cover = coverEl.attr("data-src");
                if (!cover) cover = coverEl.attr("src");
            }
            
            let desc = "";
            let authorEl = e.select("a[href*='/tac-gia/']").first();
            if (authorEl) {
                desc = "Tác giả: " + authorEl.text().trim();
            }
            
            novelList.push({
                name: name,
                link: link,
                cover: cover,
                description: desc,
                host: BASE_URL
            });
        });
        
        let next = null;
        let currentPage = page ? parseInt(page) : 1;
        let pageLinks = doc.select(".phan-trang a.btn-page");
        if (pageLinks.size() > 0) {
            let lastLink = pageLinks.last();
            let href = lastLink.attr("href");
            if (href && href.indexOf("page=") !== -1) {
                let match = href.match(/page=(\d+)/);
                if (match && parseInt(match[1]) > currentPage) {
                    next = "" + (currentPage + 1);
                }
            }
        }
        
        return Response.success(novelList, next);
    } else if (input === "new") {
        doc.select(".itemupdate").forEach(function(e) {
            let titleEl = e.select(".iname h3 a").first();
            if (!titleEl) return;
            
            let name = titleEl.text().trim();
            let link = titleEl.attr("href");
            if (!name || !link) return;
            
            let desc = "";
            let genreEl = e.select(".icate a").first();
            if (genreEl) {
                desc = genreEl.text().trim();
            }
            
            let chapterEl = e.select(".ichapter a").first();
            if (chapterEl) {
                let chapterText = chapterEl.text().trim();
                if (desc) desc += " | " + chapterText;
                else desc = chapterText;
            }
            
            novelList.push({
                name: name,
                link: link,
                cover: "",
                description: desc,
                host: BASE_URL
            });
        });
        
        return Response.success(novelList);
    }
    
    return null;
}
