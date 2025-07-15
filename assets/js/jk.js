(function () {

    setupHobbesHover()
    adjustContentHeight()
    setupSearch()
    setupImageLinks()

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
            resetStyles: false
        }
        new PagefindUI({ element: ".search", ...options })
        new PagefindUI({ element: "#off-canvas-nav .search", ...options })

        $('.pagefind-ui__drawer').css('maxHeight', `${$('.main-content').height()-240}px`)

        $('body').on('click', (e) => {
            if (!$(e.target).parents('.search').length) {
                $('.pagefind-ui__search-clear').trigger('click')
            }
        })
    }

    function setupImageLinks() {
        Array.from($('.blog-post img')).forEach((n) => {
            $(n).after(`<p class='view-image'><a href='${n.getAttribute('src')}' target='_blank'>[view]</a></p>`)
        })
    }

})()
