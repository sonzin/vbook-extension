load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    // Remove existing page param
    var baseUrl = url.replace(/[?&]page=\d+/, "");

    var data = [];

    // Fetch page 1 (normal SSR) to get initial chapters and figure out total
    let firstResponse = fetch(baseUrl);
    if (!firstResponse.ok) return null;

    let firstDoc = firstResponse.html();

    // Extract chapters from page 1
    extractChapters(firstDoc, data);

    // Determine total pages from pagination
    // Look for page numbers in the pagination section
    var totalPages = 1;

    // Method 1: Parse from text like "Số chương: 3732" or heading with (N)
    let bodyText = firstDoc.text();
    let totalChapMatch = bodyText.match(/Số chương[:\s]*(\d+)/i);
    if (!totalChapMatch) {
        totalChapMatch = bodyText.match(/(\d+)\s*chương/i);
    }
    if (totalChapMatch) {
        let totalChaps = parseInt(totalChapMatch[1]);
        // Each page has 50 chapters
        totalPages = Math.ceil(totalChaps / 50);
    }

    // Method 2: Look for pagination links/buttons with page numbers
    let pageLinks = firstDoc.select("a[href*='page=']");
    for (let i = 0; i < pageLinks.size(); i++) {
        let href = pageLinks.get(i).attr("href");
        let pageMatch = href.match(/page=(\d+)/);
        if (pageMatch) {
            let pageNum = parseInt(pageMatch[1]);
            if (pageNum > totalPages) totalPages = pageNum;
        }
    }

    // ntruyen.biz uses Next.js RSC for pagination - need RSC: 1 header
    // Fetch remaining pages using RSC header
    for (var page = 2; page <= totalPages; page++) {
        let pageUrl = baseUrl + "?page=" + page;

        // Try with RSC header first (Next.js)
        let rscResponse = fetch(pageUrl, {
            headers: {
                "RSC": "1",
                "Next-Router-State-Tree": "%5B%22%22%5D"
            }
        });

        if (rscResponse.ok) {
            let rscText = rscResponse.body();
            // Parse chapters from RSC stream
            // RSC format contains chapter data as JSON arrays/objects
            parseRscChapters(rscText, data, baseUrl);
        } else {
            // Fallback: try normal fetch
            let normalResponse = fetch(pageUrl);
            if (normalResponse.ok) {
                let doc = normalResponse.html();
                extractChapters(doc, data);
            }
        }
    }

    return Response.success(data);
}

function extractChapters(doc, data) {
    let links = doc.select("a[href*='/doc-truyen/']");
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

        // Only accept chapter-like names
        if (name.indexOf("Chương") === -1 && name.indexOf("chương") === -1) continue;

        if (seen[href]) continue;
        seen[href] = true;

        data.push({
            name: name,
            url: href,
            host: BASE_URL
        });
    }
}

function parseRscChapters(rscText, data, baseUrl) {
    // RSC stream contains chapter data like:
    // /doc-truyen/slug-chuong-N-ID
    // and chapter names like "Chương N: Title"
    let seen = {};
    for (let i = 0; i < data.length; i++) {
        seen[data[i].url] = true;
    }

    // Extract all doc-truyen links from the RSC payload
    let linkPattern = /\/doc-truyen\/[a-z0-9-]+-chuong-\d+-\d+/g;
    let linkMatches = rscText.match(linkPattern);
    if (!linkMatches) return;

    // Extract chapter names - they appear near the links in the RSC stream
    // Looking for patterns like "Chương N: Title" or "Chương N - Title"
    let namePattern = /Chương\s+\d+[:\s-]+[^"\\,\]\}]+/g;
    let nameMatches = rscText.match(namePattern);

    // Build arrays of unique links
    let uniqueLinks = [];
    let linkSet = {};
    for (let i = 0; i < linkMatches.length; i++) {
        let link = linkMatches[i];
        if (!linkSet[link] && !seen[link]) {
            linkSet[link] = true;
            uniqueLinks.push(link);
        }
    }

    // Map names to links by order
    let names = [];
    if (nameMatches) {
        for (let i = 0; i < nameMatches.length; i++) {
            let name = nameMatches[i].trim();
            // Clean up trailing special chars
            name = name.replace(/["\\\]},]+$/, "").trim();
            if (name.length > 3) {
                names.push(name);
            }
        }
    }

    for (let i = 0; i < uniqueLinks.length; i++) {
        let link = uniqueLinks[i];
        let name = "";

        if (i < names.length) {
            name = names[i];
        } else {
            // Extract chapter number from URL as fallback name
            let chNumMatch = link.match(/chuong-(\d+)/);
            name = chNumMatch ? "Chương " + chNumMatch[1] : "Chương " + (data.length + 1);
        }

        data.push({
            name: name,
            url: link,
            host: BASE_URL
        });
    }
}
