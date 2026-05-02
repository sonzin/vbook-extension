load('config.js');

function execute(key, page) {
    var url = BASE_URL + "/vi/filter?q=" + encodeURIComponent(key);
    if (page && page !== "1") {
        url = url + "&page=" + page;
    }
    
    var response = fetch(url);
    if (!response.ok) return null;
    
    var doc = response.html();
    var html = doc.html();
    
    // Primary: extract from RSC payload
    var novels = extractAllBooks(html);
    
    // Fallback: DOM selectors
    if (novels.length === 0) {
        novels = extractBooksFromDom(doc);
    }
    
    var next = null;
    var currentPage = page ? parseInt(page) : 1;
    if (html.indexOf("page=" + (currentPage + 1)) !== -1) {
        next = "" + (currentPage + 1);
    }
    
    return Response.success(novels, next);
}
