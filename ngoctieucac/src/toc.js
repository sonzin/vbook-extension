load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }

    // Strategy 1: Fetch with RSC header to get the structured data
    let response = fetch(url, {
        headers: {
            "rsc": "1"
        }
    });

    let data = [];
    if (response.ok) {
        let text = response.text();

        // Exact regex for RSC chapter data found in research
        // "chapters":[{"title":"...","chapterNumber":1},...]
        let chaptersMatch = text.match(/"chapters":\s*(\[.*?\])/);
        if (chaptersMatch) {
            try {
                let rawChapters = JSON.parse(chaptersMatch[1]);
                for (let i = 0; i < rawChapters.length; i++) {
                    let chap = rawChapters[i];
                    // Slug construction: if not in object, use chapterNumber or generate
                    let slug = chap.slug || ("chuong-" + chap.chapterNumber);
                    data.push({
                        name: chap.title || ("Chương " + chap.chapterNumber),
                        url: url.endsWith("/") ? (url + slug) : (url + "/" + slug),
                        host: BASE_URL
                    });
                }
            } catch (e) {
                // Heuristic regex if JSON.parse fails
                let items = chaptersMatch[1].match(/\{"title":"([^"]+)","chapterNumber":(\d+)\}/g);
                if (items) {
                    items.forEach(m => {
                        let t = m.match(/"title":"([^"]+)"/)[1];
                        let n = m.match(/"chapterNumber":(\d+)/)[1];
                        data.push({
                            name: t,
                            url: url.endsWith("/") ? (url + "chuong-" + n) : (url + "/chuong-" + n),
                            host: BASE_URL
                        });
                    });
                }
            }
        }
    }

    // Strategy 2: Fallback to static HTML if RSC fails or yielded no data
    if (data.length === 0) {
        let staticRes = fetch(url);
        if (staticRes.ok) {
            let html = staticRes.text();
            // Try standard JSON patterns in static HTML
            let pattern = /"title":"([^"]+)","slug":"([^"]+)"/g;
            let m;
            while ((m = pattern.exec(html)) !== null) {
                data.push({
                    name: m[1],
                    url: url.endsWith("/") ? (url + m[2]) : (url + "/" + m[2]),
                    host: BASE_URL
                });
            }
        }
    }

    // Deduplicate and filter
    let uniqueData = [];
    let urlSet = new Set();
    data.forEach(item => {
        if (!urlSet.has(item.url) && !item.url.includes('undefined')) {
            urlSet.add(item.url);
            uniqueData.push(item);
        }
    });

    return Response.success(uniqueData);
}
