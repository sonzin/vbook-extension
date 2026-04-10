load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Primary: .vung-doc
        let contentEl = doc.select(".vung-doc").first();
        if (contentEl) {
            // Clean ads and unnecessary elements
            contentEl.select("script").remove();
            contentEl.select("ins").remove();
            contentEl.select("iframe").remove();
            contentEl.select(".ads").remove();
            contentEl.select(".quangcao").remove();
            contentEl.select(".chapter-title").remove();
            contentEl.select(".chapter_control").remove();
            contentEl.select("a.back").remove();
            contentEl.select("a.next").remove();
            contentEl.select("a.btn-dschuong").remove();

            return Response.success(contentEl.html());
        }

        // Fallback selectors
        let fallbackSelectors = [".chapter-c", "#chapter-c", ".chapter-content", "#chapter-content", "#content", ".reading-content", ".content"];
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
