
;(async () => {
    const CACHE_KEY = 'jk-feed-source'
    const FEED_TIMEOUT = (1000 * 60 * 60 * 8)
    const SCROLL_HANDLER_TIMOUT = 3000
    const mainContent = document.querySelector('main .content')

    // TODO:
    // - button to exclude category (i.e. "movie interviews")
    // - save article for later
    // - cache images
    // - add comics feed!

    const templates = {
        start: `<article><h2><a href='{{link}}' target='_blank'>{{title}}</a></h2>`,
        image: `<a href='{{image}}' target='_blank'><img src='{{image}}' alt='{{altText}}' title='{{altText}}'></a>`,
        body: `<p>{{text}}</p>`,
        footer: `<footer><nav class='read-toggle'>[mark read]</nav><aside>{{category}}</aside></footer>`,
        end: `</article>`
    }

    let scrollBounce = null
    let scrollStart = 0
    document.addEventListener('scroll', _ => {
        if (!scrollStart || (Date.now() - scrollStart) < SCROLL_HANDLER_TIMOUT) {
            clearTimeout(scrollBounce)
            scrollStart = Date.now()
            scrollBounce = setTimeout(() => {
                scrollBounce = null
                scrollStart = 0
                handleScroll()
            }, SCROLL_HANDLER_TIMOUT)
        }
    })

    document.querySelector('.refresh').addEventListener('click', async _ => {
        mainContent.innerText = 'Loading...'
        
        try {
            if (scrollBounce) {
                clearTimeout(scrollBounce)
            }
            scrollBounce = null
            scrollStart = 0

            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '')
            if (cache && cache.articles) {
                cache.articles = []
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
            }
            await loadContent()
            return false

        } catch(err) {
            return console.warn('unable to mark all articles unread:', err)
        }
    })

    document.querySelector('.all-unread').addEventListener('click', async _ => {
        try {
            if (scrollBounce) {
                clearTimeout(scrollBounce)
            }
            scrollBounce = null
            scrollStart = 0

            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '')
            if (cache && cache.read) {
                cache.read = []
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
                Array.from(document.querySelectorAll('article.read')).forEach(a => {
                    a.classList.remove('read')
                    a.querySelector('footer nav').innerText = '[mark read]'
                })
            }
            
            await loadContent()

        } catch(err) {
            return console.warn('unable to mark all articles unread:', err)
        }
        return false
    })

    document.querySelector('main .content').addEventListener('click', e => {
        if (e.target.classList.contains('read-toggle')) {
            e.stopPropagation()
            if (scrollBounce) {
                clearTimeout(scrollBounce)
            }
            scrollBounce = null
            scrollStart = 0

            const article = e.target.parentNode.parentNode
            if (article.tagName.toLowerCase() === 'article') {
                if (article.classList.contains('read')) {
                    article.classList.remove('read')
                    e.target.innerText = '[mark read]'
                } else {
                    article.classList.add('read')
                    e.target.innerText = '[mark unread]'
                }
                toggleReadCache(article.querySelector('h2 a').getAttribute('href'))
            }
            return false
        }
    })

    // GET THE INITIAL CONTENT
    await loadContent()


    // --------------- HELPERS ---------------- //

    function handleScroll() {
        const articles = Array.from(document.querySelectorAll('article:not(.read)'))
        for (let i=0; i<articles.length; ++i) {
            const bounding = articles[i].getBoundingClientRect()
            if (bounding.top > -10 && bounding.top < (window.innerHeight - (bounding.height / 2))) {
                articles[i].classList.add('read')
                articles[i].querySelector('footer nav').innerText = '[mark unread]'
                toggleReadCache(articles[i].querySelector('h2 a').getAttribute('href'))
                break // only mark 1 article read per scroll
            }
        }
    }

    async function loadContent() {
        let cache = checkCache()
        if (!cache?.articles || cache?.articles?.length < 1) {
            cache = { timeout: Date.now() + FEED_TIMEOUT, read: cache?.read || [] }
            cache.articles = (await getFresh()) || []
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
        }

        if (cache.articles) {
            mainContent.innerHTML = cache.articles
                .filter(a => !cache.read?.includes(a.link))
                .map(showArticle).join('\n')
        }
    }

    function checkCache() {
        try {
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
            if (cache && cache.timeout > Date.now()) {
                return cache
            }
            return null
        } catch(err) {
            // we let this go and get fresh content
            return console.error(err)
        }
    }

    function toggleReadCache(id) {
        try {
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '')
            if (cache && Array.isArray(cache.read)) {
                if (cache.read.includes(id)) {
                    cache.read.splice(cache.read.indexOf(id), 1)
                } else {
                    cache.read.push(id)
                }
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
            }
        } catch(err) {
            return console.warn('unable to mark article read:', err)
        }
    }

    async function getFresh() {
        try {
            const resp = await fetch(`/.netlify/functions/feedSource?feed=`)
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
            mainContent.innerHTML = `<p>${err.message || err}</p>`
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
            content.push(templates.footer.replace('{{category}}', data.category))
        } else {
            content.push(templates.footer.replace('{{category}}', ''))
        }
        content.push(templates.end)
        return content.join('\n')
    }

})();