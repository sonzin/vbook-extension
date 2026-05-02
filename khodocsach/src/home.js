load('config.js');

function execute() {
    return Response.success([
        {title: "Truyện mới cập nhật", input: apiUrl("/books", {per_page: 20}), script: "gen.js"},
        {title: "Truyện hoàn thành", input: apiUrl("/books", {trang_thai: "hoan-thanh", per_page: 20}), script: "gen.js"},
        {title: "Trinh Thám", input: apiUrl("/books", {the_loai: "trinh-tham", per_page: 20}), script: "gen.js"},
        {title: "Linh Dị", input: apiUrl("/books", {the_loai: "linh-di", per_page: 20}), script: "gen.js"},
        {title: "Tiên Hiệp", input: apiUrl("/books", {the_loai: "tien-hiep", per_page: 20}), script: "gen.js"},
        {title: "Kiếm Hiệp", input: apiUrl("/books", {the_loai: "kiem-hiep", per_page: 20}), script: "gen.js"},
        {title: "Ngôn Tình", input: apiUrl("/books", {the_loai: "ngon-tinh", per_page: 20}), script: "gen.js"}
    ]);
}
