load('config.js');

function execute() {
    return Response.success([
        {title: "Tất Cả", input: "/vi/all", script: "gen.js"},
        {title: "Truyện Full", input: "/vi/truyen-hoan-thanh", script: "gen.js"},
        {title: "Văn Học", input: "/vi/sach-van-hoc", script: "gen.js"},
        {title: "Phim Ngắn", input: "/vi/shorts", script: "gen.js"}
    ]);
}
