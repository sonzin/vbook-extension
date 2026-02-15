load('config.js');

function execute() {
    // tiemtruyenchu uses /danh-sach?cat=slug for genres
    // Genre links are in the navbar dropdown
    let response = fetch(BASE_URL);
    if (response.ok) {
        let doc = response.html();
        let genres = [];
        let seen = {};

        doc.select("a[href*='cat=']").forEach(function (e) {
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

        return Response.success(genres);
    }
    return null;
}
