load('config.js');

function execute() {
    let response = fetch(BASE_URL);
    if (response.ok) {
        let doc = response.html();
        let data = [];

        // Strategy: Target all links that look like book details
        // These links usually have the pattern /truyen/[slug] (no further parts)
        let items = doc.select("a[href^='/truyen/']");
        let seen = new Set();

        for (let i = 0; i < items.size(); i++) {
            let a = items.get(i);
            let url = a.attr("href");

            // Clean URL and check depth
            let cleanUrl = url.split('?')[0].split('#')[0];
            if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
            let parts = cleanUrl.split('/');

            // truyen.com/truyen/[slug] -> length 3
            if (parts.length === 3 && !seen.has(cleanUrl)) {
                seen.add(cleanUrl);
                let name = a.text().trim();

                // If the link text is empty (e.g., it wraps an image), check for name in siblings or parent
                if (!name || name.length < 2) {
                    let container = a.parent();
                    // Look for heading or specific class
                    let nameEl = container.select("h1, h2, h3, h4, [class*='name'], [class*='title'], .line-clamp-2").first();
                    if (nameEl) name = nameEl.text().trim();
                }

                let cover = a.select("img").first().attr("src");
                if (!cover) {
                    let container = a.parent();
                    cover = container.select("img").first().attr("src");
                }

                if (name && name.length > 1) {
                    data.push({
                        name: name,
                        url: cleanUrl,
                        cover: cover,
                        host: BASE_URL
                    });
                }
            }
        }

        return Response.success(data);
    }
    return null;
}
