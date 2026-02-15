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
        let titleEl = doc.select(".story-title").first();
        if (!titleEl) titleEl = doc.select("h1").first();
        if (titleEl) name = titleEl.text().trim();

        // Cover image
        let cover = "";
        let coverEl = doc.select("img.story-poster").first();
        if (!coverEl) coverEl = doc.select(".story-cover img").first();
        if (coverEl) {
            cover = coverEl.attr("data-src");
            if (!cover) cover = coverEl.attr("src");
        }

        // Author
        let author = "";
        let authorEl = doc.select("a[href*='tac-gia']").first();
        if (authorEl) {
            author = authorEl.text().trim();
        }

        // Description - look for the tab content or intro section
        let description = "";
        let descEl = doc.select(".story-desc").first();
        if (!descEl) descEl = doc.select("[itemprop='description']").first();
        if (!descEl) {
            // Try to find description in tab panels or content sections
            let panels = doc.select(".tab-pane, .bg-white.rounded.shadow-sm.p-3");
            if (panels.size() > 0) {
                descEl = panels.first();
            }
        }
        if (descEl) {
            description = descEl.html();
        }

        // Status
        let ongoing = true;
        let statusEl = doc.select(".story-status").first();
        if (!statusEl) statusEl = doc.select(".label-status").first();
        if (!statusEl) statusEl = doc.select(".status").first();
        if (statusEl) {
            let statusText = statusEl.text().trim().toLowerCase();
            if (statusText.indexOf("hoàn thành") !== -1 || statusText.indexOf("hoan thanh") !== -1 || statusText.indexOf("full") !== -1 || statusText.indexOf("hoàn") !== -1) {
                ongoing = false;
            }
        }

        // Genres
        let genres = [];
        doc.select("a[href*='cat=']").forEach(function (e) {
            let title = e.text().trim();
            if (title) {
                genres.push({
                    title: title,
                    input: e.attr("href"),
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
    var authorEl = doc.select("a[href*='tac-gia']").first();
    if (authorEl) {
        lines.push("<b>Tác giả:</b> " + authorEl.text().trim());
    }

    // Status
    var statusEl = doc.select(".story-status").first();
    if (!statusEl) statusEl = doc.select(".status").first();
    if (statusEl) {
        lines.push("<b>Trạng thái:</b> " + statusEl.text().trim());
    }

    // Genres
    var genreEls = doc.select("a[href*='cat=']");
    if (genreEls.size() > 0) {
        var genreTexts = [];
        genreEls.forEach(function (e) {
            genreTexts.push(e.text().trim());
        });
        lines.push("<b>Thể loại:</b> " + genreTexts.join(", "));
    }

    // Other meta info
    var metaEls = doc.select(".story-meta span, .story-info span");
    metaEls.forEach(function (e) {
        var text = e.text().trim();
        if (text && text.indexOf("Tác giả") === -1 && text.indexOf("Thể loại") === -1) {
            lines.push(text);
        }
    });

    return lines.join("<br>");
}
