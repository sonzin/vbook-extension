load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();
        let data = [];

        // Parse first page chapters from the initial HTML
        let el = doc.select("#chapter-list li a");
        if (el.size() === 0) {
            el = doc.select("#chapter-list a");
        }
        for (let i = 0; i < el.size(); i++) {
            let e = el.get(i);
            let name = e.text().trim();
            let chapterUrl = e.attr("href");
            if (name && chapterUrl) {
                data.push({
                    name: name,
                    url: chapterUrl,
                    host: BASE_URL
                });
            }
        }

        // Extract storyId from page(storyId, pageNum) pattern in scripts or onclick attributes
        let pageHtml = doc.html();
        let storyIdMatch = pageHtml.match(/page\((\d+),/);
        if (storyIdMatch) {
            let storyId = storyIdMatch[1];

            // Determine total pages from pagination
            let totalPages = 1;
            let pageMatches = pageHtml.match(/page\(\d+,\s*(\d+)\)/g);
            if (pageMatches) {
                for (let p = 0; p < pageMatches.length; p++) {
                    let numMatch = pageMatches[p].match(/page\(\d+,\s*(\d+)\)/);
                    if (numMatch) {
                        let pageNum = parseInt(numMatch[1]);
                        if (pageNum > totalPages) {
                            totalPages = pageNum;
                        }
                    }
                }
            }

            // Fetch remaining pages via AJAX API
            for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
                let apiUrl = BASE_URL + "/get/listchap/" + storyId + "?page=" + pageNum;
                let apiResponse = fetch(apiUrl);
                if (apiResponse.ok) {
                    let json = apiResponse.json();
                    if (json && json.data) {
                        let chapterDoc = Html.parse(json.data);
                        let chapters = chapterDoc.select("li a");
                        if (chapters.size() === 0) {
                            chapters = chapterDoc.select("a");
                        }
                        if (chapters.size() === 0) {
                            break;
                        }
                        for (let j = 0; j < chapters.size(); j++) {
                            let c = chapters.get(j);
                            let cName = c.text().trim();
                            let cUrl = c.attr("href");
                            if (cName && cUrl) {
                                data.push({
                                    name: cName,
                                    url: cUrl,
                                    host: BASE_URL
                                });
                            }
                        }
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        return Response.success(data);
    }

    return null;
}
