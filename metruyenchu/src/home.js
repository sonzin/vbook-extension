function execute() {
    return Response.success([
        { title: "Truyện Hot", input: "hot", script: "homecontent.js" },
        { title: "Mới Cập Nhật", input: "new", script: "homecontent.js" },
        { title: "Truyện Đã Hoàn Thành", input: "completed", script: "homecontent.js" }
    ]);
}
