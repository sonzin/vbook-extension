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

// Extract a JSON object surrounding a position in HTML text
function extractJsonObject(html, pos) {
    var start = pos;
    while (start > 0 && html[start] !== '{') start--;
    
    var end = pos;
    var depth = 0;
    var inString = false;
    var escapeNext = false;
    
    for (var i = start; i < html.length && i < start + 5000; i++) {
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
    // Unescape if needed
    if (jsonStr.indexOf('\\"') >= 0) {
        jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
    }
    
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        return null;
    }
}

// Find book object by slug in raw HTML (handles both escaped and unescaped JSON)
function findBookObject(html, slug) {
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
    
    // Fallback: scan all slug occurrences
    var pattern = /"slug":"([^"]+)"/g;
    var m;
    while ((m = pattern.exec(html)) !== null) {
        if (m[1] === slug) {
            var obj = extractJsonObject(html, m.index);
            if (obj && obj.id && obj.name) {
                return obj;
            }
        }
    }
    
    // Try escaped version
    pattern = /\\"slug\\":\\"([^\\"]+)\\"/g;
    while ((m = pattern.exec(html)) !== null) {
        if (m[1] === slug) {
            var obj = extractJsonObject(html, m.index);
            if (obj && obj.id && obj.name) {
                return obj;
            }
        }
    }
    
    return null;
}

// Extract ALL books from raw HTML by finding all slug+name pairs
function extractAllBooks(html) {
    var novels = [];
    var seen = {};
    
    // Pattern 1: Unescaped JSON
    var pattern = /"slug":"([^"]+)".*?"name":"([^"]+)"/g;
    var match;
    while ((match = pattern.exec(html)) !== null) {
        var slug = match[1];
        var name = match[2];
        if (seen[slug]) continue;
        seen[slug] = true;
        
        var cover = "";
        // Search nearby for coverImage
        var searchStart = Math.max(0, match.index - 500);
        var searchEnd = Math.min(html.length, match.index + 1500);
        var nearby = html.substring(searchStart, searchEnd);
        var coverMatch = nearby.match(/"coverImage":\{"url":"([^"]+)"\}/);
        if (coverMatch) cover = coverMatch[1];
        
        novels.push({
            name: name,
            link: "/vi/reading/" + slug,
            cover: cover,
            description: "",
            host: BASE_URL
        });
    }
    
    // Pattern 2: Escaped JSON
    if (novels.length === 0) {
        pattern = /\\"slug\\":\\"([^\\"]+)\\".*?\\"name\\":\\"([^\\"]+)\\"/g;
        while ((match = pattern.exec(html)) !== null) {
            var slug = match[1];
            var name = match[2];
            if (seen[slug]) continue;
            seen[slug] = true;
            
            var cover = "";
            var searchStart = Math.max(0, match.index - 500);
            var searchEnd = Math.min(html.length, match.index + 1500);
            var nearby = html.substring(searchStart, searchEnd);
            var coverMatch = nearby.match(/\\"coverImage\\":\\{\\"url\\":\\"([^\\"]+)\\"\\}/);
            if (coverMatch) cover = coverMatch[1];
            
            novels.push({
                name: name,
                link: "/vi/reading/" + slug,
                cover: cover,
                description: "",
                host: BASE_URL
            });
        }
    }
    
    return novels;
}

// Fallback: extract books from DOM using CSS selectors
function extractBooksFromDom(doc) {
    var novels = [];
    var seen = {};
    
    var links = doc.select("a[href*='/vi/reading/']");
    for (var i = 0; i < links.size(); i++) {
        var link = links.get(i);
        var href = link.attr("href");
        if (!href || seen[href]) continue;
        seen[href] = true;
        
        var title = link.text().trim();
        var cover = "";
        
        var parent = link.parent();
        var depth = 0;
        while (parent && depth < 5) {
            var img = parent.select("img").first();
            if (img) {
                cover = img.attr("src") || img.attr("data-src") || "";
                if (!title) title = img.attr("alt") || "";
                break;
            }
            parent = parent.parent();
            depth++;
        }
        
        if (title) {
            novels.push({
                name: title,
                link: href,
                cover: cover,
                description: "",
                host: BASE_URL
            });
        }
    }
    
    return novels;
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
