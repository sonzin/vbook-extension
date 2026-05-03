load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    let slug = getSlug(url);
    let chapter = getChapterNumber(url);

    let freeUrl = DATA_URL + "/free/" + slug + "/chuong-" + chapter + ".txt";
    let response = fetch(freeUrl);
    if (response.ok) {
        let html = responseContent(response.text());
        if (html) return Response.success(html);
    }

    let previewUrl = DATA_URL + "/preview/" + slug + "/chuong-" + chapter + "-preview.txt";
    response = fetch(previewUrl);
    if (response.ok) {
        let preview = responseContent(response.text());
        if (preview) return Response.success(preview + "<p><i>Chương này chỉ có nội dung xem trước hoặc bị giới hạn quyền truy cập trên nguồn.</i></p>");
    }

    let doc = fetchDocument(url);
    if (doc) {
        let content = doc.select(".content .space-y-3, .content, div[class*='space-y-3']").first();
        if (content) {
            content.select("script, button, svg").remove();
            let html = content.html();
            if (cleanText(stripHtml(html))) return Response.success(html);
        }
    }

    return Response.success("<p>Không có nội dung hoặc chương bị giới hạn quyền truy cập.</p>");
}
