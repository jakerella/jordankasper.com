
const fs = require('fs-extra');
const logger = require('./_logger')();

module.exports = function copy(opts){
  const locations = opts.locations || []

  return function (files, metalsmith, done){
    logger.info('Copying static files');

    locations.forEach(loc => {
      logger.debug(`copying ${loc.from} to ${loc.to}`)
      fs.copySync(loc.from, loc.to);
    });

    done();
  };
}
