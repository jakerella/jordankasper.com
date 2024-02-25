
const moment = require('moment');
const logger = require('./_logger')();

module.exports = function recentPosts(opts){
  opts.limit = opts.limit || 3;

  return function (files, metalsmith, done){
    logger.debug('processing recent-posts with limit:', opts.limit);

    const data = metalsmith.metadata();
    data.recentPosts = [];
    data.posts.filter(function(post, i) {
      if (i < opts.limit) {
        post.shortDate = moment(post.date).format('M/d/Y');
        logger.debug('Added recentPost date:', post.shortDate);
        data.recentPosts.push(post);
      }
    });

    done();
  };

}
