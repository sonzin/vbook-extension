load('config.js');

function execute() {
    return Response.success([
        {title: "Tất Cả", input: "/vi/all", script: "gen.js"},
        {title: "Truyện Full", input: "/vi/truyen-hoan-thanh", script: "gen.js"},
        {title: "Văn Học", input: "/vi/sach-van-hoc", script: "gen.js"},
        {title: "Phim Ngắn", input: "/vi/shorts", script: "gen.js"},
        {title: "Tiên Hiệp", input: "/vi/all?category=tien-hiep", script: "gen.js"},
        {title: "Huyền Huyễn", input: "/vi/all?category=huyen-huyen", script: "gen.js"},
        {title: "Ngôn Tình", input: "/vi/all?category=ngon-tinh", script: "gen.js"},
        {title: "Kiếm Hiệp", input: "/vi/all?category=kiem-hiep", script: "gen.js"}
    ]);
}
