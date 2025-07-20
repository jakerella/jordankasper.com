;(async function () {

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
            // On tablet or mobile, and for images more than 2/3 the width, show "view" links
            if (window.innerWidth < 800 && (n.width / window.innerWidth) > 0.66) {
                $(n).before(`<p class='view-image'><a href='${n.getAttribute('src')}' target='_blank'>[view image]</a></p>`)
            }
        })
    }

    async function initAnalytics() {
        if (window.NO_TRACK === true) { return }
        var fp = await (await FingerprintJS.load()).get()

        const visitor = {
            id: fp.visitorId,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
        const hit = {
            p: window.location.pathname || '/',
            q: window.location.search || '',
            r: document.referrer?.replace(window.location.origin, ''),
            t: Date.now()
        }

        await fetch(`/.netlify/functions/processVisit?data=${btoa(JSON.stringify({ v: visitor, h: [hit] }))}`)

        // TODO: prevent quick repeat hits (like a quick refresh)
    }

})();
