load('config.js');

function execute(url, page) {
    // Scrape from the homepage which has SSR content
    let response = fetch(BASE_URL);
    if (response.ok) {
        let doc = response.html();
        let novelList = [];

        // Find all story links on the homepage
        let items = doc.select("a[href*='/truyen/']");
        let seen = {};

        for (let i = 0; i < items.size(); i++) {
            let a = items.get(i);
            let link = a.attr("href");

            // Only process book-level links
            if (!link || link.indexOf("/doc-truyen/") !== -1) continue;
            if (seen[link]) continue;
            seen[link] = true;

            let name = "";
            // Try to get title from p or h3 tag inside the link
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
