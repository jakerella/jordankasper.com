
const v = require('voca');
const logger = require('./_logger')();

module.exports = function excerpts(opts) {
    const length = opts.length || 500;

    return function(files, metalsmith, done) {
        logger.info('Generating post excerpts');

        Object.keys(files).forEach(function(filename) {
            if (files[filename].collection !== 'posts') { return; }
            
            logger.debug('getting excerpt for file:', filename)

            let excerpt = getExcerptText(files[filename], length);
            files[filename].excerpt = excerpt && excerpt.length > 0 ? excerpt : null;
        });
        done();
    };
};

function getExcerptText(file, length) {
    let excerpt = file.excerpt || file.contents.toString();
    excerpt = excerpt.replace(/<h\d[^\>]+>[^\<]+<\/h\d>/, '');
    excerpt = v.stripTags(excerpt, ['p', 'strong', 'em']);
    excerpt = v.prune(excerpt, length, '...');
    return excerpt;
}
