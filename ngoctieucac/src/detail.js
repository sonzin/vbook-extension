load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Title
        let name = "";
        let titleEl = doc.select("h1").first();
        if (!titleEl) titleEl = doc.select(".text-2xl").first();
        if (titleEl) name = titleEl.text().trim();

        // Cover image
        let cover = "";
        let coverEl = doc.select("img[alt*='cover'], img[alt*='Cover']").first();
        if (!coverEl) coverEl = doc.select("main img").first();
        if (!coverEl) coverEl = doc.select("img[src*='cover']").first();
        if (coverEl) {
            cover = coverEl.attr("data-src");
            if (!cover) cover = coverEl.attr("src");
        }

        // Author
        let author = "";
        let authorEl = doc.select("a[href*='/tac-gia/']").first();
        if (authorEl) {
            author = authorEl.text().trim();
        }

        // Description
        let description = "";
        let descEl = doc.select(".prose").first();
        if (!descEl) descEl = doc.select("[class*='description']").first();
        if (!descEl) descEl = doc.select("p").first();
        if (descEl) {
            description = descEl.html();
        }

        // Status
        let ongoing = true;
        let statusEl = doc.select("[class*='status']").first();
        if (statusEl) {
            let statusText = statusEl.text().trim().toLowerCase();
            if (statusText.indexOf("hoàn") !== -1 || statusText.indexOf("full") !== -1) {
                ongoing = false;
            }
        }

        return Response.success({
            name: name,
            cover: cover,
            author: author,
            description: description,
            host: BASE_URL,
            ongoing: ongoing
        });
    }
    return null;
}
