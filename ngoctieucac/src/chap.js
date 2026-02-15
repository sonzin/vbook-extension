load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }

    // Crucial: Use rsc: 1 header to get the data payload
    let response = fetch(url, {
        headers: {
            "rsc": "1"
        }
    });

    if (response.ok) {
        let text = response.text();

        // Next.js RSC payload is a stream of data. The text content is usually in strings like "..." 
        // We need to extract the actual chapter content.
        // Usually, the text part is wrapped in React structural markers.

        // Simple heuristic: look for long segments of text that look like story content
        // In NGOCTIEUCAC, the text is often inside a fragment 

        // Attempt to clean RSC markers and extract text
        // Content often starts after something like '1:"$Sreact.fragment"' and contains raw strings

        // Extract all quoted strings from the RSC payload that are likely content
        let content = "";

        // Filter out structural RSC strings and extract the story text
        // A more robust way is to look for the pattern where the story text sits
        let parts = text.split('\n');
        for (let part of parts) {
            // Check if it's a data line (starts with number:)
            if (part.includes(':"')) {
                // Extract text between quotes
                let match = part.match(/:"((?:[^"\\]|\\.)*)"/);
                if (match) {
                    let val = match[1];
                    // Unescape unicode and basic escapes
                    val = val.replace(/\\n/g, "\n").replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
                        return String.fromCharCode(parseInt(grp, 16));
                    });

                    // Filter: Story text typically doesn't look like JSON/HTML tags/Next.js internal markers
                    // but contains Vietnamese characters and sentences.
                    if (val.length > 50 && !val.includes('{"') && !val.includes('[$') && !val.includes('<')) {
                        content += val + "\n";
                    }
                }
            }
        }

        // Clean up: Remove the VIP/Lock message from preview if present
        content = content.replace(/────────────────────\n🔒 Nội dung đầy đủ chỉ dành cho thành viên VIP.*/gs, "");
        content = content.replace(/Đăng nhập để đọc tiếp.*/gs, "");

        return Response.success(content.trim());
    }

    return null;
}
