load('config.js');

function execute(url, page) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }

    if (page) {
        if (url.indexOf("?") !== -1) {
            url = url + "&page=" + page;
        } else {
            url = url + "?page=" + page;
        }
    }

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();
        let novelList = [];

        // Genre/list pages use .truyen-list .item structure
        doc.select(".truyen-list .item").forEach(function (e) {
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

        // Pagination
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
    }

    return null;
}
