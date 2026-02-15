function execute() {
    return Response.success([
        { title: "Truyện Hot", input: "hot", script: "homecontent.js" },
        { title: "Truyện Mới", input: "new", script: "homecontent.js" },
        { title: "Truyện Full", input: "completed", script: "homecontent.js" }
    ]);
}
