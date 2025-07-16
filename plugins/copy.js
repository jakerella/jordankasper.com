
const fs = require('fs-extra');
const logger = require('./_logger')();

module.exports = function copy(opts){
  const locations = opts.locations || [];

  return function (files, metalsmith, done){
    logger.info('Copying static files');

    locations.forEach(loc => {
      logger.debug(`copying ${loc.from} to ${loc.to}`);
      if (/fingerprintjs/.test(loc.from)) {
        let content = fs.readFileSync(loc.from).toString().replace('.001', '.00000001');
        fs.writeFileSync(loc.to, content)
      } else {
        fs.copySync(loc.from, loc.to);
      }
    });

    done();
  };
}
