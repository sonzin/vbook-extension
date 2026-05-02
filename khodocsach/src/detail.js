load('config.js');

function execute(url) {
    let id = getBookId(url);
    let slug = getBookSlug(url);
    let book = null;

    if (id) book = fetchJson(apiUrl("/books/" + id));
    if (!book && slug) {
        let search = fetchJson(apiUrl("/search", {q: slug.replace(/-/g, " "), per_page: 10}));
        let books = search && search.data ? search.data : [];
        for (let i = 0; i < books.length; i++) {
            if (books[i].slug === slug) {
                book = fetchJson(apiUrl("/books/" + books[i].id));
                break;
            }
        }
    }
    if (!book) return null;

    let genres = [];
    if (book.genres) {
        book.genres.forEach(function (genre) {
            let slug = genre.url ? genre.url.replace(/\/$/, "").split("/").pop() : "";
            genres.push({
                title: genre.name,
                input: apiUrl("/books", {the_loai: slug, per_page: 20}),
                script: "gen.js"
            });
        });
    }

    let detail = [];
    if (book.status && book.status.name) detail.push("Trạng thái: " + book.status.name);
    if (book.total_chapter) detail.push("Số chương: " + book.total_chapter);
    if (book.vip) detail.push("VIP: có");
    if (book.require_purchase && !book.user_owned) detail.push("Quyền truy cập: cần mua/đăng nhập trên website");

    return Response.success({
        name: book.title || "",
        cover: normalizeUrl(book.cover || ""),
        author: book.author && book.author.name ? book.author.name : "",
        description: book.desc || "",
        detail: detail.join("<br>"),
        host: BASE_URL,
        genres: genres,
        ongoing: !(book.status && book.status.slug === "hoan-thanh")
    });
}
