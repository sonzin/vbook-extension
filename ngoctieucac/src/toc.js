load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    // Remove any existing page parameter
    var baseUrl = url.replace(/[?&]page=\d+/, "");

    var data = [];
    var page = 1;
    var totalPages = 1;

    // Fetch page 1 first to determine total chapters
    let firstResponse = authFetch(baseUrl);
    if (!firstResponse.ok) return null;

    let firstDoc = firstResponse.html();

    // Extract total chapters from "Danh Sách Chương (1273)" text
    let headings = firstDoc.select("h2, h3");
    for (let h = 0; h < headings.size(); h++) {
        let text = headings.get(h).text();
        let match = text.match(/\((\d+)\)/);
        if (match && text.indexOf("Chương") !== -1) {
            let totalChapters = parseInt(match[1]);
            totalPages = Math.ceil(totalChapters / 10);
            break;
        }
    }

    // Extract chapters from page 1
    extractChapters(firstDoc, data);

    // Loop through remaining pages
    for (page = 2; page <= totalPages; page++) {
        let pageUrl = baseUrl + "?page=" + page;
        let response = authFetch(pageUrl);
        if (response.ok) {
            let doc = response.html();
            extractChapters(doc, data);
        }
    }

    return Response.success(data);
}

function extractChapters(doc, data) {
    // Chapters are in the "Danh Sách Chương" section as links with /chuong-N
    let links = doc.select("a[href*='/chuong-']");
    let seen = {};

    // Track what we already have
    for (let i = 0; i < data.length; i++) {
        seen[data[i].url] = true;
    }

    for (let i = 0; i < links.size(); i++) {
        let a = links.get(i);
        let href = a.attr("href");
        let name = a.text().trim();

        if (!href || !name) continue;

        // Only accept links with chapter-like names (e.g. "Chương 1: Kinh trập")
        // This filters out "Đọc truyện" button that also links to /chuong-1
        if (name.indexOf("Chương") === -1) continue;

        // Skip non-chapter links (must contain /chuong- followed by number)
        if (!href.match(/\/chuong-\d+$/)) continue;

        if (seen[href]) continue;

        seen[href] = true;
        data.push({
            name: name,
            url: href,
            host: BASE_URL
        });
    }
}
