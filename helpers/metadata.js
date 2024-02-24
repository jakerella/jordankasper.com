
const debug = require('debug')('metalsmith-metadata');

module.exports = function getMetadata(){
  return function (files, metalsmith, done){
    debug('metadata init');

    const data = metalsmith.metadata();
    data.fullYear = (new Date()).getFullYear()

    done();
  };

}
