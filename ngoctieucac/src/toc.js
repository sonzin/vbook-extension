load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let html = response.text();
        let data = [];

        // Strategy 1: Parse chapters from embedded JSON in page source
        // ngoctieucac.com uses Next.js which embeds chapter data in script tags
        let chaptersMatch = html.match(/"chapters"\s*:\s*(\[.*?\])/);
        if (chaptersMatch) {
            try {
                let rawChapters = JSON.parse(chaptersMatch[1]);
                for (let i = 0; i < rawChapters.length; i++) {
                    let chap = rawChapters[i];
                    let slug = chap.slug || ("chuong-" + chap.chapterNumber);
                    data.push({
                        name: chap.title || ("Chương " + chap.chapterNumber),
                        url: url.endsWith("/") ? (url + slug) : (url + "/" + slug),
                        host: BASE_URL
                    });
                }
            } catch (e) {
                // JSON parse failed, try regex fallback
            }
        }

        // Strategy 2: Fallback - find chapter links in HTML
        if (data.length === 0) {
            let doc = response.html();
            let el = doc.select("a[href*='/chuong-']");

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
        }

        return Response.success(data);
    }

    return null;
}
