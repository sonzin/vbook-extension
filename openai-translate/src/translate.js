load("language_list.js");

let BASE_URL = "http://103.152.164.242:8317/v1";
let MODEL = "gpt-5.2";
let API_KEY = "sk-Inzaghi891";

try {
    if (CONFIG_API_KEY) {
        API_KEY = CONFIG_API_KEY;
    }
} catch (error) { }

try {
    if (CONFIG_URL) {
        let parts = CONFIG_URL.split("|");
        if (parts.length >= 1 && parts[0].trim()) {
            BASE_URL = parts[0].trim();
            if (!BASE_URL.endsWith("/v1")) {
                BASE_URL = BASE_URL.replace(/\/+$/, "") + "/v1";
            }
        }
        if (parts.length >= 2 && parts[1].trim()) {
            MODEL = parts[1].trim();
        }
    }
} catch (error) { }

function execute(text, from, to) {
    return translateContent(text, from, to, 0);
}

function getChineseNovelPrompt() {
    return "Bạn là dịch giả chuyên nghiệp chuyên dịch truyện mạng Trung Quốc (网文) sang tiếng Việt. " +
        "Hãy tuân thủ các nguyên tắc sau:\n\n" +
        "1. TÊN RIÊNG: Phiên âm Hán Việt cho tên người, địa danh, môn phái, công pháp, thần thú, vũ khí... " +
        "(VD: 萧炎→Tiêu Viêm, 云岚宗→Vân Lam Tông, 斗气→Đấu Khí, 丹药→Đan Dược).\n" +
        "2. THUẬT NGỮ TU TIÊN/VÕNG VĂN: Dùng thuật ngữ chuẩn cộng đồng truyện Việt: " +
        "tu luyện, đột phá, cảnh giới, linh khí, thần thức, kiếm khí, trận pháp, cổ vật, " +
        "huyết mạch, khế ước, lôi kiếp, phi thăng, độ kiếp, kim đan, nguyên anh, hóa thần...\n" +
        "3. XƯNG HÔ: Giữ đúng phong cách cổ phong: " +
        "huynh/đệ, sư huynh/sư đệ, sư phụ/đồ đệ, tiền bối/vãn bối, cô nương, thiếu hiệp, đạo hữu...\n" +
        "4. VĂN PHONG: Dịch mượt mà, tự nhiên, đúng phong cách truyện mạng tiếng Việt. " +
        "Câu văn phải lưu loát, dễ đọc, giữ được nhịp điệu và cảm xúc của nguyên tác. " +
        "Tránh dịch máy móc word-by-word. Thành ngữ/tục ngữ Trung Quốc nên chuyển ngữ cho phù hợp.\n" +
        "5. SỬA VĂN: Nếu văn bản gốc có dấu hiệu dịch máy word-by-word hoặc convert Hán Việt thô " +
        "(câu cú lủng củng, ngữ pháp sai, đọc không tự nhiên), hãy viết lại thành câu văn chuẩn văn học, " +
        "mượt mà, dễ đọc mà vẫn giữ đúng ý nghĩa gốc.\n" +
        "6. ĐỊNH DẠNG: Giữ nguyên xuống dòng và cấu trúc đoạn văn gốc.\n" +
        "7. CHỈ xuất ra bản dịch, KHÔNG thêm chú thích, giải thích hay nội dung nào khác.";
}

function getGeneralPrompt(fromLang, targetLang) {
    return "You are a professional translator. Translate the following text" +
        fromLang + " to " + targetLang +
        ". Only output the translated text, nothing else. " +
        "Do not add any explanations, notes, or extra content. " +
        "Preserve the original formatting including line breaks.";
}

function translateContent(text, from, to, retryCount) {
    if (retryCount > 2) return null;

    let targetLang = languageMap[to] || to;
    let fromLang = "";
    if (from && languageMap[from]) {
        fromLang = " from " + languageMap[from];
    }

    let isChineseToVietnamese = (from === "zh" || (!from && isChinese(text))) && to === "vi";
    let systemPrompt = isChineseToVietnamese
        ? getChineseNovelPrompt()
        : getGeneralPrompt(fromLang, targetLang);

    let data = {
        model: MODEL,
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: text
            }
        ],
        temperature: 0.3
    };

    let response = fetch(BASE_URL + "/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + API_KEY
        },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        let result = response.json();
        if (result.choices && result.choices.length > 0) {
            let translated = result.choices[0].message.content;
            if (translated) {
                return Response.success(translated.trim());
            }
        }
    }

    return translateContent(text, from, to, retryCount + 1);
}

function isChinese(text) {
    let sample = text.substring(0, Math.min(100, text.length));
    let chineseCount = 0;
    for (let i = 0; i < sample.length; i++) {
        let code = sample.charCodeAt(i);
        if (code >= 0x4E00 && code <= 0x9FFF) {
            chineseCount++;
        }
    }
    return chineseCount > sample.length * 0.3;
}
