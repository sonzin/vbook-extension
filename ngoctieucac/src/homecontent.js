load('config.js');

function execute(url, page) {
    let requestUrl = BASE_URL;

    if (url === "new") {
        requestUrl = BASE_URL + "/danh-sach?sapXep=capNhat";
    } else {
        // hot / default
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

        // Find all story links on listing pages
        let items = doc.select("a[href^='/truyen/']");
        let seen = new Set();

        for (let i = 0; i < items.size(); i++) {
            let a = items.get(i);
            let href = a.attr("href");

            // Only book-level links (/truyen/slug), not chapter links
            let cleanHref = href.split('?')[0].split('#')[0];
            if (cleanHref.endsWith('/')) cleanHref = cleanHref.slice(0, -1);
            let parts = cleanHref.split('/');

            if (parts.length === 3 && !seen.has(cleanHref)) {
                seen.add(cleanHref);
                let name = a.text().trim();

                if (!name || name.length < 2) {
                    let container = a.parent();
                    let nameEl = container.select("h1, h2, h3, h4, .line-clamp-2").first();
                    if (nameEl) name = nameEl.text().trim();
                }

                let cover = "";
                let imgEl = a.select("img").first();
                if (imgEl) {
                    cover = imgEl.attr("data-src");
                    if (!cover) cover = imgEl.attr("src");
                }
                if (!cover) {
                    let container = a.parent();
                    imgEl = container.select("img").first();
                    if (imgEl) {
                        cover = imgEl.attr("data-src");
                        if (!cover) cover = imgEl.attr("src");
                    }
                }

                if (name && name.length > 1) {
                    novelList.push({
                        name: name,
                        link: cleanHref,
                        cover: cover,
                        host: BASE_URL
                    });
                }
            }
        }

        // Pagination
        let next = null;
        let currentPage = page ? parseInt(page) : 1;
        let pageLinks = doc.select("a[href*='trang=']");
        if (pageLinks.size() > 0) {
            let lastLink = pageLinks.last();
            let href = lastLink.attr("href");
            if (href) {
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
