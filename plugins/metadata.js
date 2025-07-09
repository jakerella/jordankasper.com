
const logger = require('./_logger')();

module.exports = function getMetadata(){
  return function (files, metalsmith, done){
    logger.info('Adding custom metadata')

    logger.debug('Source folder:', metalsmith.source());
    logger.debug('Destination folder:', metalsmith.destination());

    const data = metalsmith.metadata();
    data.fullYear = (new Date()).getFullYear()
    logger.debug(`Set fullYear to ${data.fullYear}`)

    done();
  };

}
