(function () {

    setupHobbesHover();
    adjustContentHeight();
    setupSearch();

    function setupHobbesHover() {
        const hobbes = $('.hobbes-hover');
        hobbes.on('mouseover', function() {
            $(this)
                .attr('data-oldsrc', $(this).attr('src'))
                .attr('src', '/images/hobbes_small.png');
        });
        hobbes.on('mouseout', function() {
            $(this).attr('src', $(this).attr('data-oldsrc'));
        });
    }

    function adjustContentHeight() {
        var content = $('.main-content'),
            sh = $('.sidebar').height(),
            ch = content.height();

        if (sh > ch) {
            content.css('min-height', sh + 'px');
        }
    }

    function setupSearch() {
        var input = $('.search [type="query"]');
        $('.search').on('submit', function(e) {
            e.preventDefault();
            window.location.href = 'https://www.google.com/?gws_rd=ssl#q=site:jordankasper.com+' + input.val();
            return false;
        });
    }

})();
