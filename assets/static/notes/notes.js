(function ($) {
    const bin = window.location.hash || 'misc';
    $('.notes-title .bin').text(bin);

    const data = localStorage.getItem(bin);

    const field = $('.edit-notes')
        .val(data)
        .keydown(function(e) {
            if (e.keyCode === 9) {
                e.preventDefault();
            }
        })
        .keyup(function(e) {
            if (e.keyCode === 9) {
                const split = field[0].selectionStart;
                field.val(
                    field.val().substr(0, split) +
                    '  ' +
                    field.val().substr(split)
                );
                field[0].selectionStart = split + 2;
                field[0].selectionEnd = split + 2;
            }
            localStorage.setItem(bin, field.val());
        })
        .focus();

})(window.jQuery);
