load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();
        let content = doc.select("#chapter-reading-content").first();
        if (!content) content = doc.select(".reading-content").first();
        if (!content) content = doc.select(".text-left").first();
        if (!content) content = doc.select(".entry-content").first();

        if (content) {
            content.select("script, iframe, ins, style, .aam-ad-container, .aam-mvOXQg, .carousel, .spinner, #loading-box").remove();
            content.select(".chapter-title, .chapter_control, .chapter_wrap, .line-control, .chap-info").remove();
            content.select("#download-book, .btn-dschuong, .back, .next").remove();
            return Response.success(content.html());
        }
    }

    return null;
}
