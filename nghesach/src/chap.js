load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    
    // Check if this is an EPUB URL
    if (url.indexOf(".epub") !== -1) {
        return Response.success("<p>EPUB chưa được hỗ trợ đọc trực tiếp. Vui lòng tải về hoặc đọc trên website.</p>");
    }
    
    return Response.success("<p>Nội dung chương chưa được hỗ trợ trong extension. Vui lòng truy cập website để đọc/nghe.</p>");
}
