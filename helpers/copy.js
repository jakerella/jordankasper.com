
const fs = require('fs-extra');
const debug = require('debug')('metalsmith-copy');

module.exports = function copy(opts){

  return function (files, metalsmith, done){
    debug('copy module init:');
    fs.copySync('assets/static/', 'build/');
    fs.copySync('node_modules/jquery/dist/jquery.min.js', 'build/js/vendor/jquery.min.js');
    done();
  };
}
