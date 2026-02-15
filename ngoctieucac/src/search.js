load('config.js');

function execute(key, page) {
    if (!page) page = '1';
    let url = BASE_URL + '/tim-kiem?q=' + encodeURIComponent(key);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();
        let data = [];

        let items = doc.select(".grid > div");
        for (let i = 0; i < items.size(); i++) {
            let item = items.get(i);
            let a = item.select("a").first();
            let name = item.select("h3, .line-clamp-2").first().text().trim();
            let url = a.attr("href");
            let cover = item.select("img").first().attr("src");
            let author = item.select(".text-xs").first().text().trim();

            if (name && url) {
                data.push({
                    name: name,
                    url: url,
                    cover: cover,
                    author: author,
                    host: BASE_URL
                });
            }
        }

        return Response.success(data);
    }
    return null;
}
