load('config.js');

function execute(url, page) {
    var requestUrl = BASE_URL;

    if (url === "new") {
        requestUrl = BASE_URL + "/danh-sach?sapXep=capNhat";
    } else {
        requestUrl = BASE_URL + "/danh-sach?sapXep=xuHuong";
    }

    if (page) {
        if (requestUrl.indexOf("?") !== -1) {
            requestUrl = requestUrl + "&trang=" + page;
        } else {
            requestUrl = requestUrl + "?trang=" + page;
        }
    }

    let response = fetch(requestUrl);
    if (response.ok) {
        let doc = response.html();
        let novelList = [];

        doc.select("a[href*='/truyen/']").forEach(function (e) {
            let link = e.attr("href");
            if (!link || link.indexOf("/chuong-") !== -1) return;

            let name = "";
            let titleEl = e.select("h3").first();
            if (titleEl) {
                name = titleEl.text().trim();
            } else {
                name = e.text().trim();
            }
            if (!name || name.length < 2) return;

            let cover = "";
            let imgEl = e.select("img").first();
            if (!imgEl) {
                let parent = e.parent();
                if (parent) imgEl = parent.select("img").first();
            }
            if (imgEl) {
                cover = imgEl.attr("data-src");
                if (!cover) cover = imgEl.attr("src");
            }

            novelList.push({
                name: name,
                link: link,
                cover: cover,
                host: BASE_URL
            });
        });

        // Pagination
        let next = null;
        let currentPage = page ? parseInt(page) : 1;
        let pageLinks = doc.select("a[href*='trang=']");
        if (pageLinks.size() > 0) {
            let lastLink = pageLinks.last();
            let href = lastLink.attr("href");
            if (href && href.indexOf("trang=") !== -1) {
                let match = href.match(/trang=(\d+)/);
                if (match && parseInt(match[1]) > currentPage) {
                    next = "" + (currentPage + 1);
                }
            }
        }

        return Response.success(novelList, next);
    }

    return null;
}
