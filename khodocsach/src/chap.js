load('config.js');

function execute(url) {
    let chapterId = getChapterId(url);
    if (!chapterId) return null;

    let ticketResponse = fetch(apiUrl("/chapters/" + chapterId + "/ticket"));
    if (!ticketResponse.ok) {
        return Response.success("<p>Không lấy được vé đọc chương. Nếu đây là chương VIP, vui lòng mở trên website bằng tài khoản có quyền truy cập.</p>");
    }

    let ticket = ticketResponse.json();
    if (!ticket || !ticket.nonce || !ticket.exp || !ticket.sig) {
        return Response.success("<p>Website không cấp quyền đọc chương này cho phiên hiện tại.</p>");
    }

    let chapterResponse = fetch(apiUrl("/chapters/" + chapterId, {
        nonce: ticket.nonce,
        exp: ticket.exp,
        sig: ticket.sig
    }));

    if (!chapterResponse.ok) {
        return Response.success("<p>Chương này cần đăng nhập, mua truyện hoặc quyền VIP trên Kho Đọc Sách.</p>");
    }

    let chapter = chapterResponse.json();
    if (chapter && chapter.content) {
        let content = chapter.content;
        content = content.replace(/<script[\s\S]*?<\/script>/gi, "");
        content = content.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
        return Response.success(content);
    }

    let message = chapter && chapter.message ? chapter.message : "Không có nội dung chương hoặc chương bị giới hạn quyền truy cập.";
    return Response.success("<p>" + message + "</p>");
}
