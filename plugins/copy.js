
const fs = require('fs-extra');
const logger = require('./_logger')();

module.exports = function copy(opts){
  const locations = opts.locations || []

  return function (files, metalsmith, done){
    locations.forEach(loc => {
      logger.info(`copying ${loc.from} to ${loc.to}`)
      fs.copySync(loc.from, loc.to);
    });

    done();
  };
}
