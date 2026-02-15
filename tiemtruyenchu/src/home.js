function execute() {
    return Response.success([
        { title: "Biên tập viên đề cử", input: "editor", script: "homecontent.js" },
        { title: "Mới cập nhật", input: "new", script: "homecontent.js" },
        { title: "Truyện mới", input: "newest", script: "homecontent.js" }
    ]);
}
