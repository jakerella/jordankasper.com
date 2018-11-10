
const v = require('voca');

module.exports = function() {
    return function(files, metalsmith, done) {
        Object.keys(files).forEach(function(filename) {
            if (!/\.html$/.test(filename)) { return; }

            let excerpt = getExcerptText(files[filename]);
            files[filename].excerpt = excerpt && excerpt.length > 0 ? excerpt : null;
        });
        done();
    };
};

function getExcerptText(file) {
    let excerpt = file.excerpt || file.contents.toString();
    excerpt = excerpt.replace(/<h\d[^\>]+>[^\<]+<\/h\d>/, '');
    excerpt = v.stripTags(excerpt, ['p', 'strong', 'em']);
    excerpt = v.prune(excerpt, 500, '...');
    return excerpt;
}
