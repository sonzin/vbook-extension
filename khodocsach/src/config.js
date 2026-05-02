var BASE_URL = "https://khodocsach.com";
var API_URL = BASE_URL + "/wp-json/app/v1";

function normalizeUrl(url) {
    if (!url) return BASE_URL;
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) return BASE_URL + url;
    if (!url.startsWith("http")) return BASE_URL + "/" + url;
    return url.replace(/^https?:\/\/(www\.)?khodocsach\.com/, BASE_URL);
}

function cleanText(text) {
    return text ? text.replace(/\s+/g, " ").trim() : "";
}

function stripHtml(html) {
    return html ? cleanText(html.replace(/<[^>]+>/g, " ")) : "";
}

function getBookSlug(url) {
    url = normalizeUrl(url).split("?")[0].replace(/\/$/, "");
    let parts = url.split("/");
    let slug = parts[parts.length - 1] || "";
    return slug.replace(/\.kds$/, "");
}

function getBookId(url) {
    let match = (url || "").match(/[?&]id=(\d+)/);
    return match ? match[1] : null;
}

function getChapterId(url) {
    let match = (url || "").match(/-p(\d+)(?:\D|$)/);
    if (match) return match[1];
    match = (url || "").match(/[?&](?:id|chapter_id)=(\d+)/);
    return match ? match[1] : null;
}

function apiUrl(path, params) {
    let url = API_URL + path;
    let query = [];
    if (params) {
        for (let key in params) {
            if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
                query.push(key + "=" + encodeURIComponent(params[key]));
            }
        }
    }
    return query.length ? url + "?" + query.join("&") : url;
}

function fetchJson(url) {
    let response = fetch(url);
    if (!response.ok) return null;
    return response.json();
}

function bookLink(book) {
    return BASE_URL + "/" + book.slug + ".kds?id=" + book.id;
}

function chapterLink(chapter) {
    return normalizeUrl(chapter.url);
}

function bookDescription(book) {
    let parts = [];
    if (book.author && book.author.name) parts.push("Tác giả: " + book.author.name);
    if (book.status && book.status.name) parts.push("Trạng thái: " + book.status.name);
    if (book.total_chapter) parts.push("Số chương: " + book.total_chapter);
    if (book.vip) parts.push("VIP");
    if (book.require_purchase && !book.user_owned) parts.push("Cần mua/quyền truy cập");
    return parts.join(" - ");
}

function mapBooks(json) {
    let data = [];
    let books = json && json.data ? json.data : [];
    books.forEach(function (book) {
        data.push({
            name: book.title || "",
            link: bookLink(book),
            cover: normalizeUrl(book.cover || ""),
            description: bookDescription(book),
            host: BASE_URL
        });
    });
    return data;
}

function nextPage(json, page) {
    let pagination = json ? json.pagination : null;
    let current = page ? parseInt(page) : 1;
    if (pagination && pagination.total_pages && current < parseInt(pagination.total_pages)) {
        return "" + (current + 1);
    }
    return null;
}
