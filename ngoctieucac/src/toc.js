load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = authFetch(url);
    if (response.ok) {
        let text = response.text();
        let data = [];

        // Strategy 1: Parse chapters from self.__next_f.push scripts
        // ngoctieucac.com embeds ALL chapter data in Next.js RSC payload
        // Pattern: "title":"Chapter Title","chapterNumber":N
        let allMatches = text.match(/"title":"[^"]*","chapterNumber":\d+/g);
        if (allMatches && allMatches.length > 0) {
            let seen = {};
            for (let i = 0; i < allMatches.length; i++) {
                let m = allMatches[i];
                let titleMatch = m.match(/"title":"([^"]*)"/);
                let numMatch = m.match(/"chapterNumber":(\d+)/);
                if (titleMatch && numMatch) {
                    let title = titleMatch[1];
                    let num = parseInt(numMatch[1]);
                    if (!seen[num]) {
                        seen[num] = true;
                        // Unescape unicode
                        title = title.replace(/\\u([0-9a-fA-F]{4})/g, function (match, grp) {
                            return String.fromCharCode(parseInt(grp, 16));
                        });
                        data.push({
                            name: title || ("Chương " + num),
                            url: url.endsWith("/") ? (url + "chuong-" + num) : (url + "/chuong-" + num),
                            host: BASE_URL
                        });
                    }
                }
            }
            // Sort by chapter number
            data.sort(function (a, b) {
                let numA = parseInt(a.url.match(/chuong-(\d+)/)[1]);
                let numB = parseInt(b.url.match(/chuong-(\d+)/)[1]);
                return numA - numB;
            });
        }

        // Strategy 2: Fallback - find chapter links in HTML
        if (data.length === 0) {
            let doc = response.html();
            let el = doc.select("a[href*='/chuong-']");

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
        }

        return Response.success(data);
    }

    return null;
}
