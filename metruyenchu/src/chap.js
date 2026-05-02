load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Primary: .vung-doc .truyen
        let contentEl = doc.select(".vung-doc .truyen").first();
        if (!contentEl) contentEl = doc.select(".truyen").first();
        if (contentEl) {
            contentEl.select("script").remove();
            contentEl.select("ins").remove();
            contentEl.select("iframe").remove();
            contentEl.select(".ads").remove();
            contentEl.select(".quangcao").remove();
            return Response.success(contentEl.html());
        }

        // Fallback: .vung-doc
        let vungDoc = doc.select(".vung-doc").first();
        if (vungDoc) {
            vungDoc.select(".chapter-title").remove();
            vungDoc.select(".chapter_control").remove();
            vungDoc.select("a.back").remove();
            vungDoc.select("a.next").remove();
            vungDoc.select("a.btn-dschuong").remove();
            vungDoc.select("script").remove();
            vungDoc.select("ins").remove();
            vungDoc.select("iframe").remove();
            return Response.success(vungDoc.html());
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
