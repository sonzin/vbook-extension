load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Extract basic details
        let name = doc.select("h1").first().text().trim();
        let author = doc.select(".flex.items-center.gap-2.text-sm").first().text().replace("Tác giả:", "").trim();
        let description = doc.select(".text-sm.leading-relaxed").text().trim();
        let cover = doc.select("img.rounded-lg").first().attr("src");

        return Response.success({
            name: name,
            author: author,
            description: description,
            cover: cover,
            host: BASE_URL
        });
    }
    return null;
}
