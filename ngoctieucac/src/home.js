function execute() {
    return Response.success([
        { title: "Xem nhiều", input: "hot", script: "homecontent.js" },
        { title: "Xu hướng", input: "trending", script: "homecontent.js" },
        { title: "Mới cập nhật", input: "new", script: "homecontent.js" }
    ]);
}
