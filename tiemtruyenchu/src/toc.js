load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Chapter list is in #chapter-list-container
        let el = doc.select("#chapter-list-container a");
        if (el.size() === 0) {
            // Fallback: try other selectors
            el = doc.select(".chapter-list a[href*='chuong'], .chapter-list a[href*='doc-truyen']");
        }
        if (el.size() === 0) {
            el = doc.select("a[href*='/doc-truyen/']");
        }

        let data = [];
        for (let i = 0; i < el.size(); i++) {
            let e = el.get(i);
            let name = e.text().trim();
            let chapterUrl = e.attr("href");
            if (name && chapterUrl) {
                data.push({
                    name: name,
                    url: chapterUrl,
                    host: BASE_URL
                });
            }
        }

        return Response.success(data);
    }

    return null;
}
