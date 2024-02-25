
const logger = require('./_logger')();

module.exports = function getMetadata(){
  return function (files, metalsmith, done){
    logger.info('Source folder:', metalsmith.source());
    logger.info('Destination folder:', metalsmith.destination());

    const data = metalsmith.metadata();
    data.fullYear = (new Date()).getFullYear()

    done();
  };

}
