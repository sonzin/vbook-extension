load('config.js');

function execute(url, page) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    
    if (page && page !== "1") {
        if (url.indexOf("?") !== -1) {
            url = url + "&page=" + page;
        } else {
            url = url + "?page=" + page;
        }
    }
    
    var response = fetch(url);
    if (!response.ok) return null;
    
    var doc = response.html();
    var html = doc.html();
    
    // Primary: extract from RSC payload in raw HTML
    var novels = extractAllBooks(html);
    
    // Fallback: DOM selectors
    if (novels.length === 0) {
        novels = extractBooksFromDom(doc);
    }
    
    // Pagination
    var next = null;
    var currentPage = page ? parseInt(page) : 1;
    if (html.indexOf("page=" + (currentPage + 1)) !== -1) {
        next = "" + (currentPage + 1);
    }
    
    return Response.success(novels, next);
}
