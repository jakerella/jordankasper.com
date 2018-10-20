
const fs = require('fs');
const path = require('path');
const RSS = require('rss');
const moment = require('moment');
const debug = require('debug')('metalsmith-rss');

module.exports = function tagcloud(opts){

  return function (files, metalsmith, done){
    debug('rss module init');

    const data = metalsmith.metadata();

    const feed = new RSS({
      title: data.description,
      description: 'Blog posts from Jordan Kasper',
      feed_url: `${data.url}/rss`,
      site_url: data.url,
      image_url: `${data.url}/images/hobbes_small.png`,
      managingEditor: data.author,
      webMaster: data.author,
      copyright: `${(new Date()).getFullYear()} ${data.author}`,
      language: 'en',
      categories: ['Software Development','JavaScript','Front End', 'Technology', 'Learning'],
      pubDate: `${moment().format('MMMM d, YYYY')} 00:00:00 GMT`,
      ttl: '1440'
    });

    data.posts.forEach(function(post) {
      feed.item({
        title:  post.title,
        description: post.excerpt,
        url: `${data.url}/${post.path}`,
        guid: post.path,
        categories: post.tags.map(function(tag) { return tag.name }),
        author: data.author,
        date: post.date
      });
    });

    const location = path.join(__dirname, '..', 'build', 'rss');
    const xml = feed.xml({indent: true});

    debug('Writing blog post XML to %s', location);
    fs.writeFile(location, xml, function functionName(err) {
      if (err) { return done(err); }
      debug('Wrote XML content to destination');
      done();
    });
  };

}
