load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    // Try RSC fetch first - may bypass the client-side unlock wall
    let rscResponse = fetch(url, {
        headers: {
            "RSC": "1",
            "Next-Router-State-Tree": "%5B%22%22%5D"
        }
    });

    if (rscResponse.ok) {
        let rscText = rscResponse.body();
        let content = extractContentFromRsc(rscText);
        if (content && content.length > 100) {
            return Response.success(content);
        }
    }

    // Fallback: normal HTML fetch
    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Try common content selectors
        let selectors = [
            ".break-words.leading-relaxed",
            ".break-words",
            ".leading-relaxed",
            ".chapter-content",
            "#chapter-content",
            ".reading-content",
            "#content",
            "article",
            ".prose"
        ];

        for (var i = 0; i < selectors.length; i++) {
            let el = doc.select(selectors[i]).first();
            if (el && el.text().trim().length > 100) {
                // Remove ad/unlock elements
                el.select("script").remove();
                el.select("ins").remove();
                el.select("iframe").remove();
                el.select("a[href*='shopee']").remove();
                el.select("a[href*='tiktok']").remove();
                el.select("a[href*='lazada']").remove();
                el.select("[class*='unlock']").remove();
                el.select("[class*='adsbygoogle']").remove();

                let text = el.text().trim();
                // Skip if it's just the unlock message
                if (text.indexOf("NHẤN vào LIÊN KẾT") !== -1 && text.length < 500) continue;
                if (text.indexOf("mở khóa") !== -1 && text.length < 500) continue;

                return Response.success(el.html());
            }
        }

        // Fallback: try to extract from script tags (Next.js embedded data)
        let scripts = doc.select("script");
        for (let i = 0; i < scripts.size(); i++) {
            let scriptText = scripts.get(i).html();
            if (scriptText.length > 2000 && scriptText.indexOf("self.__next_f.push") !== -1) {
                let content = extractContentFromRsc(scriptText);
                if (content && content.length > 100) {
                    return Response.success(content);
                }
            }
        }
    }

    return null;
}

function extractContentFromRsc(rscText) {
    // Extract story content from RSC/Next.js payload
    // Content is typically within the payload as escaped HTML or text blocks

    // Look for paragraph content - escaped HTML paragraphs
    let paragraphs = [];

    // Pattern 1: content as HTML with <p> tags (escaped in JSON)
    let pPattern = /<p[^>]*>(.*?)<\/p>/g;
    let match;
    while ((match = pPattern.exec(rscText)) !== null) {
        let text = match[1].trim();
        // Skip short/empty paragraphs and ad content
        if (text.length < 5) continue;
        if (text.indexOf("shopee") !== -1) continue;
        if (text.indexOf("tiktok") !== -1) continue;
        if (text.indexOf("LIÊN KẾT") !== -1) continue;
        paragraphs.push("<p>" + text + "</p>");
    }

    if (paragraphs.length > 5) {
        return paragraphs.join("\n");
    }

    // Pattern 2: escaped content like \\u003cp\\u003e
    let escapedText = rscText;
    try {
        // Try to unescape \\uXXXX sequences
        escapedText = rscText.replace(/\\u003c/g, "<").replace(/\\u003e/g, ">").replace(/\\u0026/g, "&").replace(/\\n/g, "\n");
    } catch (e) { }

    let pPattern2 = /<p[^>]*>(.*?)<\/p>/g;
    while ((match = pPattern2.exec(escapedText)) !== null) {
        let text = match[1].trim();
        if (text.length < 5) continue;
        if (text.indexOf("shopee") !== -1) continue;
        if (text.indexOf("tiktok") !== -1) continue;
        if (text.indexOf("LIÊN KẾT") !== -1) continue;
        paragraphs.push("<p>" + text + "</p>");
    }

    if (paragraphs.length > 5) {
        return paragraphs.join("\n");
    }

    // Pattern 3: Look for large text blocks (story text) between quotes
    let textBlockPattern = /"([^"]{200,})"/g;
    while ((match = textBlockPattern.exec(rscText)) !== null) {
        let text = match[1];
        if (text.indexOf("function") !== -1) continue;
        if (text.indexOf("module") !== -1) continue;
        if (text.indexOf("webpack") !== -1) continue;
        // This looks like story content
        return "<p>" + text.replace(/\\n/g, "</p><p>") + "</p>";
    }

    return null;
}
