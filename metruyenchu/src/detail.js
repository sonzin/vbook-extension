load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Title
        let name = "";
        let titleEl = doc.select("h1[itemprop='name']").first();
        if (!titleEl) titleEl = doc.select("h1").first();
        if (titleEl) name = titleEl.text().trim();

        // Cover image
        let cover = "";
        let coverEl = doc.select(".book-info-pic img").first();
        if (!coverEl) coverEl = doc.select("img[src*='/media/']").first();
        if (!coverEl) coverEl = doc.select("img").first();
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
        let descEl = doc.select("[itemprop='description']").first();
        if (!descEl) descEl = doc.select(".intro").first();
        if (!descEl) descEl = doc.select(".desc-text").first();
        if (!descEl) descEl = doc.select(".description").first();
        if (descEl) {
            description = descEl.html();
        }

        // Status
        let ongoing = true;
        let pageText = doc.text();
        let statusMatch = pageText.match(/Trạng thái\s*:\s*(.*)/);
        if (statusMatch) {
            let statusText = statusMatch[1].trim().toLowerCase();
            if (statusText.indexOf("hoàn thành") !== -1 || statusText.indexOf("full") !== -1 || statusText.indexOf("hoàn") !== -1) {
                ongoing = false;
            }
        }

        // Genres
        let genres = [];
        let seen = {};
        doc.select("a[href*='/the-loai/']").forEach(function (e) {
            let title = e.text().trim();
            let href = e.attr("href");
            if (title && href && !seen[title]) {
                seen[title] = true;
                genres.push({
                    title: title,
                    input: href,
                    script: "gen.js"
                });
            }
        });

        // Detail info
        let detail = getDetail(doc);

        return Response.success({
            name: name,
            cover: cover,
            author: author,
            description: description,
            detail: detail,
            host: BASE_URL,
            genres: genres,
            ongoing: ongoing
        });
    }
    return null;
}

function getDetail(doc) {
    var lines = [];

    // Author
    var authorEl = doc.select("a[href*='/tac-gia/']").first();
    if (authorEl) {
        lines.push("<b>Tác giả:</b> " + authorEl.text().trim());
    }

    // Status
    var pageText = doc.text();
    var statusMatch = pageText.match(/Trạng thái\s*:\s*(.*)/);
    if (statusMatch) {
        lines.push("<b>Trạng thái:</b> " + statusMatch[1].trim());
    }

    // Chapter count
    var chapterMatch = pageText.match(/Số chương\s*:\s*(\d+)/);
    if (chapterMatch) {
        lines.push("<b>Số chương:</b> " + chapterMatch[1]);
    }

    // Genres
    var genreEls = doc.select("a[href*='/the-loai/']");
    if (genreEls.size() > 0) {
        var genreTexts = [];
        var seen = {};
        genreEls.forEach(function (e) {
            var t = e.text().trim();
            if (t && !seen[t]) {
                seen[t] = true;
                genreTexts.push(t);
            }
        });
        if (genreTexts.length > 0) {
            lines.push("<b>Thể loại:</b> " + genreTexts.join(", "));
        }
    }

    return lines.join("<br>");
}
