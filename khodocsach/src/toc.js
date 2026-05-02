load('config.js');

function execute(url) {
    let id = getBookId(url);
    if (!id) return null;

    let data = [];
    let page = 1;
    let totalPages = 1;
    do {
        let json = fetchJson(apiUrl("/books/" + id + "/chapters", {page: page, per_page: 50}));
        if (!json) break;
        let chapters = json.data || [];
        chapters.forEach(function (chapter) {
            data.push({
                name: chapter.title || ("Chương " + chapter.index),
                url: chapterLink(chapter),
                host: BASE_URL
            });
        });
        totalPages = json.pagination && json.pagination.total_pages ? parseInt(json.pagination.total_pages) : 1;
        page++;
    } while (page <= totalPages);

    data.reverse();
    return Response.success(data);
}
