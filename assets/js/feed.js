
;(async () => {
    const CACHE_KEY = 'jk-feed-source'
    const main = document.querySelector('main')

    // TODO:
    // - add button to force refresh (no cache)
    // - hide seen articles (how? by title? some id? manually mark?)
    // - button to exclude category (i.e. "movie interviews")
    // - add comics feed!

    const templates = {
        start: `<article><h2><a href='{{link}}' target='_blank'>{{title}}</a></h2>`,
        image: `<a href='{{image}}' target='_blank'><img src='{{image}}' alt='{{altText}}' title='{{altText}}'></a>`,
        body: `<p>{{text}}</p>`,
        category: `<aside>{{category}}</aside>`,
        end: `</article>`
    }

    let articles = checkCache()
    if (!articles) {
        articles = await getFresh()
        if (articles) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timeout: Date.now() + (1000 * 60 * 60 * 8),
                articles
            }))
        }
    }

    console.log(articles)
    if (articles) {
        main.innerHTML = articles.map(showArticle).join('\n')
    }


    // --------------- HELPERS ---------------- //

    function checkCache() {
        try {
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
            if (cache && cache.timeout > Date.now()) {
                console.log('Using cached articles!')
                return cache.articles
            }
        } catch(err) {
            // we let this go and get fresh content
            return console.error(err)
        }
    }

    async function getFresh() {
        try {
            const resp = await fetch(`/.netlify/functions/getFeed?feed=`)
            if (resp.status > 299) {
                throw new Error(`Unable to retrieve feed (${resp.status})`)
            } else {
                articles = await resp.json()
            }

            if (!Array.isArray(articles) || !articles.length) {
                throw new Error(`<p>No feed articles found.</p>`)
            }

            return articles

        } catch(err) {
            main.innerHTML = `<p>${err.message || err}</p>`
            return console.error(err)
        }
    }

    function showArticle(data) {
        const start = templates.start.replace('{{link}}', data.link).replace('{{title}}', data.title)
        const content = [start]
        if (data.image) {
            let imageContent = templates.image.replaceAll('{{image}}', data.image)
            imageContent = imageContent.replaceAll('{{altText}}', data.altText || '')
            content.push(imageContent)
        }
        if (data.text) {
            content.push(templates.body.replace('{{text}}', data.text))
        }
        if (data.category) {
            content.push(templates.category.replace('{{category}}', data.category))
        }
        content.push(templates.end)
        return content.join('\n')
    }

})();