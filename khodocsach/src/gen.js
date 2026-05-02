load('config.js');

function execute(url, page) {
    url = normalizeUrl(url);
    if (page && page !== "1") {
        url = url.replace(/[?&]page=\d+/, "");
        url = url + (url.indexOf("?") >= 0 ? "&" : "?") + "page=" + page;
    } else if (url.indexOf("page=") < 0) {
        url = url + (url.indexOf("?") >= 0 ? "&" : "?") + "page=1";
    }

    let json = fetchJson(url);
    if (!json) return null;
    return Response.success(mapBooks(json), nextPage(json, page));
}
