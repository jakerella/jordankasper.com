
const moment = require('moment');
const debug = require('debug')('metalsmith-recent-posts');

module.exports = function tagcloud(opts){
  opts.limit = opts.limit || 3;

  return function (files, metalsmith, done){
    debug('recent-posts init with limit: %s', opts.limit);

    const data = metalsmith.metadata();
    data.recentPosts = [];
    data.posts.filter(function(post, i) {
      if (i < opts.limit) {
        post.shortDate = moment(post.date).format('M/d/Y');
        debug('Added recentPost date: %s', post.shortDate);
        data.recentPosts.push(post);
      }
    });

    done();
  };

}
