load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = authFetch(url);
    if (response.ok) {
        let doc = response.html();

        // Primary: space-y-3 container with p.leading-relaxed
        let contentEl = doc.select("div.space-y-3").first();
        if (contentEl) {
            contentEl.select("script").remove();
            contentEl.select("ins").remove();
            contentEl.select("iframe").remove();
            return Response.success(contentEl.html());
        }

        // Fallback: collect all p.leading-relaxed
        let paragraphs = doc.select("p.leading-relaxed");
        if (paragraphs.size() > 0) {
            let html = "";
            for (let i = 0; i < paragraphs.size(); i++) {
                html += paragraphs.get(i).outerHtml();
            }
            return Response.success(html);
        }

        // Last resort: try common content selectors
        let fallbackSelectors = [".chapter-content", "#chapter-content", "#content", ".reading-content"];
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
