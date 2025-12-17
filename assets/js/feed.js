
;(async () => {
    const DEFAULT_FEED = 'news'
    const CACHE_PREFIX = 'jk-feed-source'
    const FEED_TIMEOUT = (1000 * 60 * 60 * 8)
    const SCROLL_HANDLER_TIMOUT = 2000
    const mainContent = document.querySelector('main .content')

    // TODO:
    // - mark read when click through
    // - add options (⚙) for un-excluding category, light mode, changing feed timeout
    // - save article for later? (otherwise "read" things get cleared out)

    const MARK_READ = '👁 ☐'
    const MARK_UNREAD = '👁 ☑'
    const templates = {
        start: `<article id='{{id}}'><h2><a href='{{link}}' target='_blank'>{{title}}</a></h2>`,
        image: `<aside class='image'>
            <a href='{{imageUrl}}' target='_blank'>
                <img src='{{imageData}}' alt='{{imageAltText}}' title='{{imageAltText}}'>
                <div class='alt-trigger'>⚎</div>
            </a>
            <p class='alt-text'>{{imageAltText}}</p>
        </aside>`,
        body: `<p>{{text}}</p>`,
        date: `<time datetime='{{date}}'>{{date}}</time>`,
        footer: `<footer>
            <nav class='read-toggle'>${MARK_READ}</nav>
            <aside class='category'>{{category}}</aside>
        </footer>`,
        end: `</article>`
    }


    let currentFeed = DEFAULT_FEED
    let scrollBounce = null
    let scrollStart = 0


    // *************************************************** //
    async function main() {
        setEventHandlers()
        const feed = location.hash.substring(1)
        currentFeed = feed || DEFAULT_FEED
        await loadContent()
    }
    // *************************************************** //


    function setEventHandlers() {
        Array.from(document.querySelectorAll('.read-news, .read-comics')).forEach(trigger => {
            trigger.addEventListener('click', async e => {
                const feed = e.target.classList.toString().match(/(?:\s|^)read\-([a-z]+)(?:\s|$)/)[1]
                await switchFeed(feed)
            })
        })

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
            try {
                killScrollTimer()
                mainContent.innerText = 'Loading...'
                await loadContent(true)
            } catch(err) {
                console.warn('unable to mark all articles unread:', err)
            }
        })

        document.querySelector('.all-unread').addEventListener('click', async _ => {
            try {
                killScrollTimer()
                const cache = getCache()
                cache.read = []
                localStorage.setItem(`${CACHE_PREFIX}-${currentFeed}`, JSON.stringify(cache))
                Array.from(document.querySelectorAll('article.read')).forEach(a => {
                    a.classList.remove('read')
                    a.querySelector('footer nav').innerText = MARK_READ
                })
                await loadContent()

            } catch(err) {
                console.warn('Unable to mark all articles unread:', err)
            }
        })

        document.querySelector('.trash').addEventListener('click', async _ => {
            try {
                killScrollTimer()
                mainContent.innerText = 'Loading...'
                localStorage.removeItem(`${CACHE_PREFIX}-${currentFeed}`)
                await loadContent()
            } catch(err) {
                console.warn('There was a problem removing cached data:', err)
            }
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
            if (e.target.classList.contains('category')) {
                e.stopPropagation()
                killScrollTimer()
                const category = toggleCategory(e.target.innerText)
                Array.from(document.querySelectorAll('article')).forEach(articleNode => {
                    const articleCat = articleNode.querySelector('.category')
                    if (articleCat && normalizeCategory(articleCat.innerText) === category) {
                        articleNode.parentNode.removeChild(articleNode)
                    }
                })
                return false
            }
            if (e.target.classList.contains('alt-trigger')) {
                e.preventDefault()
                e.stopPropagation()
                e.target.style.display = 'none'
                const altTextElem = e.target.parentNode.parentNode.querySelector('.alt-text')
                if (altTextElem) { altTextElem.style.display = 'block' }
                return false
            }
            if (e.target.classList.contains('alt-text')) {
                e.preventDefault()
                e.stopPropagation()
                e.target.style.display = 'none'
                const altTriggerElem = e.target.parentNode.querySelector('.alt-trigger')
                if (altTriggerElem) { altTriggerElem.style.display = 'flex' }
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
        const feed = (currentFeed) ? currentFeed : DEFAULT_FEED
        let cache = getCache()
        let newArticles = null
        if (
            forceNew ||
            cache.timeout < Date.now() ||
            !cache.articles.length
        ) {
            let since = ''
            if (cache.articles[0]?.timestamp) {
                const sinceDate = dateFromTimestamp(cache.articles[0]?.timestamp)
                if (sinceDate) { since  = `&since=${sinceDate}` }
            }

            try {
                const resp = await fetch(`/.netlify/functions/feedSource?feed=${feed}${since}`)
                if (resp.status !== 200) {
                    throw new Error(`API failed to return content. (${resp.status})`)
                }
                newArticles = (await resp.json()) || []

            } catch(err) {
                console.error('Unable to get new articles from API:', err)
                newArticles = []
            }
        }

        if (newArticles) {
            cache = saveArticles(newArticles)
        }

        showContent(cache)
    }

    async function switchFeed(feed) {
        if (feed && feed !== currentFeed) {
            try {
                killScrollTimer()
                mainContent.innerText = 'Loading...'
                currentFeed = feed
                location.hash = feed
                let cache = getCache()
                if (cache.timeout < Date.now() || !cache.articles.length) {
                    await loadContent(true)
                } else {
                    showContent(cache)
                }
            }  catch(err) {
                console.warn('unable to switch feed source:', err)
            }
        }
    }

    function showContent(cache) {
        mainContent.innerHTML = cache.articles
            .filter(a => !cache.read?.includes(a.id))
            .filter(a => !cache.exclude?.includes(normalizeCategory(a.category)))
            .map(showArticle).join('\n')
    }

    function getCache() {
        const empty = { articles: [], timeout: 0, read: [], exclude: [] }
        try {
            const data = localStorage.getItem(`${CACHE_PREFIX}-${currentFeed}`)
            const cache = JSON.parse(data || 'null')
            document.querySelector('.cache-size').innerText = Math.round((data || '').length / 10000) / 100
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
            toSave = toSave.filter(a => !cache.read.includes(a.id))
        }
        const uniqueIDs = new Set()
        cache.articles = toSave.filter(a => {
            if (!uniqueIDs.has(a.id)) {
                uniqueIDs.add(a.id)
                return true
            }
            return false
        })
        if (resetTimeout) {
            cache.timeout = Date.now() + FEED_TIMEOUT
        }
        try {
            localStorage.setItem(`${CACHE_PREFIX}-${currentFeed}`, JSON.stringify(cache))
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
            localStorage.setItem(`${CACHE_PREFIX}-${currentFeed}`, JSON.stringify(cache))

        } catch(err) {
            return console.warn('unable to mark article read:', err)
        }
    }

    function normalizeCategory(category) {
        return (category || 'uncategorized').toLowerCase().trim()
    }

    function dateFromTimestamp(ts) {
        const d = new Date(ts)
        return (d.getTime()) ? d.toISOString().split('T')[0] : null
    }

    function toggleCategory(category) {
        const normalized = normalizeCategory(category)

        try {
            const cache = getCache()
            if (!cache.exclude) { cache.exclude = [] }
            if (cache.exclude.includes(normalized)) {
                cache.exclude.splice(cache.exclude.indexOf(normalized), 1)
            } else {
                cache.exclude.push(normalized)
            }
            localStorage.setItem(`${CACHE_PREFIX}-${currentFeed}`, JSON.stringify(cache))
            return normalized

        } catch(err) {
            return console.warn('unable to hide category:', err)
        }
    }

    function showArticle(data) {
        const content = [
            templates.start
                .replace('{{id}}', data.id)
                .replace('{{link}}', data.link)
                .replace('{{title}}', data.title)
        ]
        if (data.images) {
            data.images.forEach(image => {
                let imageContent = templates.image.replaceAll('{{imageUrl}}', image.url)
                if (image.data) {
                    imageContent = imageContent.replaceAll('{{imageData}}', 'data:image/jpeg;base64,'+image.data)
                } else {
                    imageContent = imageContent.replaceAll('{{imageData}}', image.url)
                }
                imageContent = imageContent.replaceAll('{{imageAltText}}', image.altText || '')
                content.push(imageContent)
            })
        }
        if (data.text) {
            content.push(templates.body.replace('{{text}}', data.text || ''))
        }
        if (data.timestamp) {
            content.push(templates.date.replaceAll('{{date}}', dateFromTimestamp(data.timestamp) || ''))
        }

        if (data.category) {
            content.push(templates.footer.replace('{{category}}', data.category))
        } else {
            content.push(templates.footer.replace('{{category}}', 'uncategorized'))
        }
        content.push(templates.end)
        return content.join('\n')
    }


    // ******************* START IT UP ******************* //
                              main()
    // *************************************************** //

})();