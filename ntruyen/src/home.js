function execute() {
    return Response.success([
        { title: "Thịnh hành", input: "hot", script: "homecontent.js" },
        { title: "Mới cập nhật", input: "new", script: "homecontent.js" },
        { title: "Đề xuất", input: "recommend", script: "homecontent.js" }
    ]);
}
