var BASE_URL = "https://nghesach.net";

function normalizeUrl(url) {
    if (!url) return BASE_URL;
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) return BASE_URL + url;
    if (!url.startsWith("http")) return BASE_URL + "/" + url;
    return url.replace(/^https?:\/\/(www\.)?nghesach\.net/, BASE_URL);
}

function getSlugFromUrl(url) {
    url = normalizeUrl(url);
    var match = url.match(/\/vi\/reading\/([^\/\?]+)/);
    return match ? match[1] : null;
}

function extractJsonObject(html, pos) {
    var start = pos;
    while (start > 0 && html[start] !== '{') start--;
    
    var end = pos;
    var depth = 0;
    var inString = false;
    var escapeNext = false;
    
    for (var i = start; i < html.length; i++) {
        var char = html[i];
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        if (char === '\\') {
            escapeNext = true;
            continue;
        }
        if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (char === '{') depth++;
            if (char === '}') {
                depth--;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }
    }
    
    if (end <= start) return null;
    
    var jsonStr = html.substring(start, end + 1);
    if (jsonStr.indexOf('\\"') >= 0) {
        jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
    }
    
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        return null;
    }
}

function extractBookFromPage(html, slug) {
    var patterns = [
        new RegExp('"slug":"' + slug + '"'),
        new RegExp('\\\\"slug\\\\":\\\\"' + slug + '\\\\"')
    ];
    
    for (var i = 0; i < patterns.length; i++) {
        var match = patterns[i].exec(html);
        if (match) {
            var obj = extractJsonObject(html, match.index);
            if (obj && obj.id && obj.name) {
                return obj;
            }
        }
    }
    
    return null;
}

function getCoverFromDoc(doc) {
    var coverMeta = doc.select("meta[property='og:image']").first();
    if (coverMeta) return coverMeta.attr("content") || "";
    var coverImg = doc.select("img[src*='res.cloudinary.com']").first();
    if (coverImg) return coverImg.attr("src") || "";
    return "";
}

function getTitleFromDoc(doc) {
    var titleMeta = doc.select("meta[property='og:title']").first();
    if (titleMeta) {
        var t = titleMeta.attr("content");
        if (t) return t.trim();
    }
    var h1 = doc.select("h1").first();
    if (h1) return h1.text().trim();
    return "";
}

function getDescriptionFromDoc(doc) {
    var descMeta = doc.select("meta[property='og:description']").first();
    if (descMeta) {
        var d = descMeta.attr("content");
        if (d) return d.trim();
    }
    return "";
}
