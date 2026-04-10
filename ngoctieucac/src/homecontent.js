load('config.js');

var API_URL = "https://api.itruyenchu.com";

function execute(url, page) {
    var pageNum = page ? parseInt(page) : 1;
    var requestUrl = API_URL + "/books?limit=20&page=" + pageNum;

    if (url === "new") {
        requestUrl += "&sapXep=moiCapNhat";
    } else if (url === "trending") {
        requestUrl += "&sapXep=xuHuong";
    } else {
        // hot / default - most read
        requestUrl += "&sapXep=luotDoc";
    }

    let response = fetch(requestUrl);
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
