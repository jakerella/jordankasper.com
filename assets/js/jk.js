(async function () {

    setupHobbesHover()
    adjustContentHeight()
    setupSearch()
    setupImageLinks()
    await setupAnalytics()

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

    async function setupAnalytics() {
        var fp = await (await FingerprintJS.load()).get()

        const visitData = {
            id: fp.visitorId,
            p: window.location.path,
            q: window.location.search,
            ref: document.referrer,
            ua: navigator.userAgent,
            ts: Date.now(),
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            bounce: 0
        }

        // TODO:
        // Store data in localStorage, send on interval (after X amount of time has passed)
        //  - need to track pages and page _views_ (count), but maybe with a timeout?
        //  - track searches?
        // Check for window unload, send data (and indicate bounce, but just on that last page)

        const resp = await fetch(`/.netlify/functions/processVisit?data=${btoa(JSON.stringify(visitData))}`)
        if (resp.status === 200) {
            console.log(await resp.json())
        } else {
            console.debug(`analytic API failed: ${resp.status}: ${await resp.text()}`)
        }
    }

})()
