load('config.js');

var API_URL = "https://api.itruyenchu.com";

function execute(key, page) {
    var pageNum = page ? parseInt(page) : 1;
    var url = API_URL + "/books?title=" + encodeURIComponent(key) + "&limit=20&page=" + pageNum;

    let response = fetch(url);
    if (response.ok) {
        let json = response.json();
        let novelList = [];

        if (json.data) {
            for (var i = 0; i < json.data.length; i++) {
                var book = json.data[i];
                var name = book.title || "";
                var slug = book.slug || "";
                var cover = book.bannerURL || "";
                var author = book.tacGia || "";

                if (!name || !slug) continue;

                novelList.push({
                    name: name,
                    link: "/truyen/" + slug,
                    cover: cover,
                    description: author,
                    host: BASE_URL
                });
            }
        }

        // Pagination
        var next = null;
        if (json.totalPages && pageNum < json.totalPages) {
            next = "" + (pageNum + 1);
        }

        return Response.success(novelList, next);
    }

    return null;
}
