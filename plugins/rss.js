
const fs = require('fs');
const path = require('path');
const RSS = require('rss');
const moment = require('moment');
const logger = require('./_logger')();

module.exports = function rss(opts){
  const language = opts.language || 'en'
  const description = opts.description || ''
  const relative_image_path = opts.image_url || ''
  const categories = opts.categories || []

  return function (files, metalsmith, done) {
    logger.info('Generating RSS feed');

    const data = metalsmith.metadata();

    const feed = new RSS({
      title: data.description,
      description,
      feed_url: `${data.url}/rss`,
      site_url: data.url,
      image_url: `${data.url}/${relative_image_path}`,
      managingEditor: data.author,
      webMaster: data.author,
      copyright: `${(new Date()).getFullYear()} ${data.author}`,
      language,
      categories,
      pubDate: `${moment().format('MMMM d, YYYY')} 00:00:00 GMT`,
      ttl: '1440'
    });

    data.posts.forEach(function(post) {
      logger.debug(`Created RSS entry for post: ${post.title}`)
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

    const buildDir = path.join(__dirname, '..', 'build');
    const location = path.join(buildDir, 'rss');
    const xml = feed.xml({indent: true});

    if (!fs.existsSync(buildDir)) {
      logger.debug('Build directory does not exist, creating it...');
      fs.mkdirSync(buildDir);
    }

    logger.debug('Writing blog post XML to', location);
    
    fs.writeFile(location, xml, function functionName(err) {
      if (err) { return done(err); }
      logger.debug('Wrote XML content to destination');
      done();
    });
  };

}
