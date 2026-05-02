load('config.js');

function execute(key, page) {
    let current = page ? page : "1";
    let url = apiUrl("/search", {q: key, page: current, per_page: 20});
    let json = fetchJson(url);
    if (!json) return null;
    return Response.success(mapBooks(json), nextPage(json, current));
}
