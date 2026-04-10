load('config.js');

function execute(key, page) {
    var pageNum = page ? parseInt(page) : 1;
    var url = BASE_URL + "/tim-kiem?q=" + encodeURIComponent(key);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();
        let novelList = [];
        let seen = {};

        let items = doc.select("a[href*='/truyen/']");
        for (let i = 0; i < items.size(); i++) {
            let a = items.get(i);
            let link = a.attr("href");

            if (!link || link.indexOf("/doc-truyen/") !== -1) continue;
            if (seen[link]) continue;
            seen[link] = true;

            let name = "";
            let titleEl = a.select("p").first();
            if (!titleEl) titleEl = a.select("h3").first();
            if (titleEl) {
                name = titleEl.text().trim();
            }
            if (!name || name.length < 2) {
                name = a.text().trim();
            }
            if (!name || name.length < 2) continue;

            let cover = "";
            let imgEl = a.select("img").first();
            if (imgEl) {
                cover = imgEl.attr("data-src") || imgEl.attr("src");
            }

            novelList.push({
                name: name,
                link: link,
                cover: cover,
                host: BASE_URL
            });
        }

        return Response.success(novelList, null);
    }

    return null;
}
