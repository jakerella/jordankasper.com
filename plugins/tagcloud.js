
const logger = require('./_logger')();

module.exports = function tagcloud(opts){
  opts.key = opts.key || 'tags';

  return function (files, metalsmith, done){
    logger.debug('tagcloud using metadata key:', opts.key);

    const data = metalsmith.metadata();
    data.tagcloud = [];
    Object.keys(data[opts.key]).forEach(function(name) {
      logger.info('Adding tag entry with data:', name, data[opts.key][name].urlSafe, data[opts.key][name].length);
      data.tagcloud.push({
        name,
        slug: data[opts.key][name].urlSafe,
        weight: data[opts.key][name].length,
        weightName: getTagWeightName(data[opts.key][name].length)
      })
    });

    done();
  };

  function getTagWeightName(count) {
    let size = 'tiny';
    count = count || 0;
    if (count > 15) {
        size = 'enormous';
    } else if (count > 10) {
        size = 'massive';
    } else if (count > 7) {
        size = 'large';
    } else if (count > 4) {
        size = 'medium';
    } else if (count > 1) {
        size = 'small';
    }
    return size;
  }
}
