load('config.js');

function execute() {
    let json = fetchJson(apiUrl("/terms/the_loai"));
    let data = [];
    let terms = json && json.data ? json.data : [];
    terms.forEach(function (term) {
        if (term.slug && term.name) {
            data.push({
                title: term.name,
                input: apiUrl("/books", {the_loai: term.slug, per_page: 20}),
                script: "gen.js"
            });
        }
    });
    return Response.success(data);
}
