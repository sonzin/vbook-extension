load('config.js');

function execute(url, page) {
    var requestUrl = BASE_URL;

    if (url === "new") {
        requestUrl = BASE_URL + "/danh-sach/truyen-moi/";
    } else if (url === "completed") {
        requestUrl = BASE_URL + "/danh-sach/truyen-full/";
    } else {
        // hot - default
        requestUrl = BASE_URL + "/danh-sach/truyen-hot/";
    }

    if (page) {
        if (requestUrl.indexOf("?") !== -1) {
            requestUrl = requestUrl + "&page=" + page;
        } else {
            requestUrl = requestUrl + "?page=" + page;
        }
    }

    let response = fetch(requestUrl);
    if (response.ok) {
        let doc = response.html();
        let novelList = parseNovelList(doc);

        // Pagination
        let next = null;
        let currentPage = page ? parseInt(page) : 1;
        let pageLinks = doc.select(".pagination a");
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
    }

    return null;
}

function parseNovelList(doc) {
    let novelList = [];

    // Stories are in .truyen-list .item or similar containers
    doc.select(".truyen-list .item, .list-truyen .item").forEach(function (e) {
        let titleEl = e.select("h3 a").first();
        if (!titleEl) titleEl = e.select("a").first();
        if (!titleEl) return;

        let name = titleEl.text().trim();
        let link = titleEl.attr("href");
        if (!name || !link) return;

        let cover = "";
        let coverEl = e.select("a.cover img, .cover img, img").first();
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

    return novelList;
}
