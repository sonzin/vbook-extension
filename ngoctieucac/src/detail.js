load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = authFetch(url);
    if (response.ok) {
        let doc = response.html();

        // Title
        let name = "";
        let titleEl = doc.select("h1").first();
        if (titleEl) name = titleEl.text().trim();

        // Cover image
        let cover = "";
        let coverEl = doc.select("img[src*='cover']").first();
        if (!coverEl) coverEl = doc.select("img[src*='book']").first();
        if (!coverEl) coverEl = doc.select("main img").first();
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
        let descEl = doc.select(".max-h-72").first();
        if (!descEl) descEl = doc.select("[class*='description']").first();
        if (descEl) {
            description = descEl.html();
        }

        // Status
        let ongoing = true;

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
