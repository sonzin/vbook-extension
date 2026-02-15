load('config.js');

function execute(url, page) {
    // ngoctieucac.com is a Next.js site - listing pages render client-side only
    // We must scrape from the homepage which has SSR content
    let response = fetch(BASE_URL);
    if (response.ok) {
        let doc = response.html();
        let novelList = [];

        // The homepage has multiple sections with h2 headers:
        // "Xem Nhiều", "Mới nhất", "Đề Cử", "Khám Phá", "Truyện Hot"
        // Each section contains story links with h3 titles

        // Find all story links on the homepage
        let items = doc.select("a[href*='/truyen/']");
        let seen = {};

        for (let i = 0; i < items.size(); i++) {
            let a = items.get(i);
            let link = a.attr("href");

            // Only book-level links, skip chapter links
            if (!link || link.indexOf("/chuong-") !== -1) continue;
            if (seen[link]) continue;
            seen[link] = true;

            let name = "";
            let titleEl = a.select("h3").first();
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
                cover = imgEl.attr("data-src");
                if (!cover) cover = imgEl.attr("src");
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
