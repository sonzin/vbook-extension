function execute() {
    return Response.success([
        { title: "Xem nhiều", input: "hot", script: "homecontent.js" },
        { title: "Truyện hot", input: "trending", script: "homecontent.js" },
        { title: "Đề cử", input: "recommend", script: "homecontent.js" }
    ]);
}
