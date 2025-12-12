
;(async () => {
    const CACHE_KEY = 'jk-feed-source'
    const NEWS_URL = 'https://npr.org'
    const FEED_TIMEOUT = (1000 * 60 * 60 * 8)
    const SCROLL_HANDLER_TIMOUT = 2000
    const mainContent = document.querySelector('main .content')

    // TODO:
    // - cache images
    // - add comics feed (multi-source)
    // - use a hide/show thing for image altText
    // - button to exclude category (i.e. "movie interviews")
    // - add options for un-excluding category, light mode, changing feed timeout
    // - save article for later? (otherwise "read" things get cleared out)

    const MARK_READ = '👁 ☐'
    const MARK_UNREAD = '👁 ☑'
    const templates = {
        start: `<article id='{{id}}'><h2><a href='{{link}}' target='_blank'>{{title}}</a></h2>`,
        image: `<a href='{{image}}' target='_blank'><img src='{{image}}' alt='{{altText}}' title='{{altText}}'></a>`,
        body: `<p>{{text}}</p>`,
        footer: `<footer><nav class='read-toggle'>${MARK_READ}</nav><aside>{{category}}</aside></footer>`,
        end: `</article>`
    }

    let scrollBounce = null
    let scrollStart = 0


    // *************************************************** //
    async function main() {
        setEventHandlers()
        await loadContent()
    }
    // *************************************************** //


    function setEventHandlers() {
        document.addEventListener('scroll', _ => {
            if (!scrollStart || (Date.now() - scrollStart) < SCROLL_HANDLER_TIMOUT) {
                killScrollTimer()
                scrollStart = Date.now()
                scrollBounce = setTimeout(() => {
                    killScrollTimer()
                    handleScroll()
                }, SCROLL_HANDLER_TIMOUT)
            }
        })

        document.querySelector('.refresh').addEventListener('click', async _ => {
            mainContent.innerText = 'Loading...'
            try {
                killScrollTimer()
                await loadContent(true)
            } catch(err) {
                console.warn('unable to mark all articles unread:', err)
            }
            return false
        })

        document.querySelector('.all-unread').addEventListener('click', async _ => {
            try {
                killScrollTimer()

                const cache = getCache()
                cache.read = []
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
                Array.from(document.querySelectorAll('article.read')).forEach(a => {
                    a.classList.remove('read')
                    a.querySelector('footer nav').innerText = MARK_READ
                })
                await loadContent()

            } catch(err) {
                console.warn('Unable to mark all articles unread:', err)
            }
            return false
        })

        document.querySelector('.trash').addEventListener('click', async _ => {
            try {
                killScrollTimer()
                localStorage.removeItem(CACHE_KEY)
                await loadContent()
            } catch(err) {
                console.warn('There was a problem removing cached data:', err)
            }
            return false
        })

        document.querySelector('main .content').addEventListener('click', e => {
            if (e.target.classList.contains('read-toggle')) {
                e.stopPropagation()
                killScrollTimer()

                const article = e.target.parentNode.parentNode
                if (article.tagName.toLowerCase() === 'article') {
                    if (article.classList.contains('read')) {
                        article.classList.remove('read')
                        e.target.innerText = MARK_READ
                    } else {
                        article.classList.add('read')
                        e.target.innerText = MARK_UNREAD
                    }
                    toggleReadCache(article.getAttribute('id'))
                }
                return false
            }
        })
    }

    // --------------- HELPERS ---------------- //

    function handleScroll() {
        const articles = Array.from(document.querySelectorAll('article:not(.read)'))
        for (let i=0; i<articles.length; ++i) {
            const bounding = articles[i].getBoundingClientRect()
            if (bounding.top > -20 && bounding.top < (window.innerHeight - (bounding.height / 2))) {
                articles[i].classList.add('read')
                articles[i].querySelector('footer nav').innerText = MARK_UNREAD
                toggleReadCache(articles[i].getAttribute('id'))
                break // only mark 1 article read per scroll
            }
        }
    }

    function killScrollTimer() {
        if (scrollBounce) {
            clearTimeout(scrollBounce)
        }
        scrollBounce = null
        scrollStart = 0
    }

    async function loadContent(forceNew = false) {
        let cache = getCache()
        let newArticles = null
        if (
            forceNew ||
            cache.timeout > Date.now() ||
            !cache.articles.length
        ) {
            newArticles = (await getContent()) || []
        }
        if (newArticles) {
            cache = saveArticles(newArticles)
        }

        if (cache.articles.length) {
            mainContent.innerHTML = cache.articles
                .filter(a => !cache.read.includes(a.id))
                .map(showArticle).join('\n')
        }
    }

    function getCache() {
        const empty = { articles: [], timeout: 0, read: [] }
        try {
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
            return (cache) ? cache: empty
        } catch(err) {
            console.warn('Unable to retrieve cache:', err)
            return empty
        }
    }

    function saveArticles(articles = [], resetTimeout = true, removeRead = true) {
        const cache = getCache()
        let toSave = cache.articles.concat(articles)
        if (removeRead) {
            toSave = toSave.filter(a => !cache.read.includes(a.link))
        }
        cache.articles = toSave
        if (resetTimeout) {
            cache.timeout = Date.now() + FEED_TIMEOUT
        }
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
        } catch(err) {
            console.warn('Unable to save feed data:', err)
        }
        return getCache()
    }

    function toggleReadCache(id) {
        try {
            const cache = getCache()
            if (cache.read.includes(id)) {
                cache.read.splice(cache.read.indexOf(id), 1)
            } else {
                cache.read.push(id)
            }
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

        } catch(err) {
            return console.warn('unable to mark article read:', err)
        }
    }

    async function getContent() {
        try {
            const resp = await fetch(`/.netlify/functions/feedSource?feed=`)
            if (resp.status !== 200) {
                throw new Error(`API failed to return content. (${resp.status})`)
            }
            return (await resp.json()) || []

        } catch(err) {
            console.error('Unable to get new articles from API:', err)
            return []
        }
    }

    function showArticle(data) {
        const content = [
            templates.start
                .replace('{{id}}', data.id)
                .replace('{{link}}', data.link)
                .replace('{{title}}', data.title)
        ]
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


    // ******************* START IT UP ******************* //
                              main()
    // *************************************************** //

})();