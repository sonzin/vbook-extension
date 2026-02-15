load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Primary: .chapter-content
        let contentEl = doc.select(".chapter-content").first();
        if (contentEl) {
            // Clean ads and unnecessary elements
            contentEl.select("script").remove();
            contentEl.select("ins").remove();
            contentEl.select("iframe").remove();
            contentEl.select(".ads").remove();
            contentEl.select(".quangcao").remove();

            return Response.success(contentEl.html());
        }

        // Fallback selectors
        let fallbackSelectors = ["#chapter-content", ".chapter-c", "#content", ".reading-content", ".vung-doc"];
        for (var i = 0; i < fallbackSelectors.length; i++) {
            let el = doc.select(fallbackSelectors[i]).first();
            if (el) {
                el.select("script").remove();
                el.select("ins").remove();
                el.select("iframe").remove();
                return Response.success(el.html());
            }
        }
    }

    return null;
}
