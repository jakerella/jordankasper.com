(async function () {

    const LOCAL_ANALYTIC_KEY = 'jk-hits'
    const ANALYTIC_TIMEOUT = 1000 * 30 // (1000 * 60 * 60 * 2)

    setupHobbesHover()
    adjustContentHeight()
    setupSearch()
    setupImageLinks()
    await initAnalytics()

    function setupHobbesHover() {
        const hobbes = $('.hobbes-hover')
        hobbes.on('mouseover', function() {
            $(this)
                .attr('data-oldsrc', $(this).attr('src'))
                .attr('src', '/images/hobbes_small.png')
        })
        hobbes.on('mouseout', function() {
            $(this).attr('src', $(this).attr('data-oldsrc'))
        })
    }

    function adjustContentHeight() {
        const content = $('.main-content')
        const sh = $('.sidebar').height()
        if (sh > content.height()) {
            content.css('min-height', sh + 'px');
        }
    }

    function setupSearch() {
        const options = {
            showSubResults: false,
            pageSize: 5,
            showImages: false,
            excerptLength: 30,
            showEmptyFilters: false,
            resetStyles: false,
            highlightParam: 'q'
        }
        new PagefindUI({ element: '.search', ...options })
        new PagefindUI({ element: '#off-canvas-nav .search', ...options })

        $('.pagefind-ui__drawer').css('maxHeight', `${$('.main-content').height()-240}px`)

        $('body').on('click', (e) => {
            if (!$(e.target).parents('.search').length) {
                $('.pagefind-ui__search-clear').trigger('click')
            }
        })
    }

    async function setupImageLinks() {
        Array.from($('.blog-post img')).forEach((n) => {
            $(n).after(`<p class='view-image'><a href='${n.getAttribute('src')}' target='_blank'>[view]</a></p>`)
        })
    }

    async function initAnalytics() {
        var fp = await (await FingerprintJS.load()).get()

        const visitor = {
            id: fp.visitorId,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
        const hit = {
            p: window.location.pathname || '/',
            q: window.location.search,
            r: document.referrer,
            t: Date.now()
        }

        let data = localStorage.getItem(LOCAL_ANALYTIC_KEY) || null
        if (data) {
            try {
                data = JSON.parse(atob(data))
                if (data.v.id !== visitor.id) {
                    data = null
                } else {
                    // console.debug('Previous analytic data:', JSON.stringify(data, null, 2))
                    data.h.push(hit)
                }
            } catch(err) { /* we'll have to start over */ }
        }
        if (!data) {
            data = {
                last: 0,
                v: visitor,
                h: [hit]
            }
        }

        if ((Date.now() - data.last) > ANALYTIC_TIMEOUT) {
            // console.debug(`Last analytic send was more than ${Math.round(ANALYTIC_TIMEOUT / 1000)} seconds ago...`)
            const resp = await fetch(`/.netlify/functions/processVisit?data=${btoa(JSON.stringify(data))}`)
            if (resp.status === 200) {
                // console.debug(`Analytics sent: ${resp.status}`, JSON.stringify(data, null, 2))
                data.last = Date.now()
                data.h = []
            } else {
                console.debug(`Analytic API call failed: ${resp.status}`)
            }
        }
        localStorage.setItem(LOCAL_ANALYTIC_KEY, btoa(JSON.stringify(data)))
    }

})()
