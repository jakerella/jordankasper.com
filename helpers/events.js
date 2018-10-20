
const moment = require('moment');
const debug = require('debug')('metalsmith-events');
const events = require('./events.json').events;

module.exports = function tagcloud(opts){
  opts.targetPast = opts.targetPast || 'pastEvents';
  opts.targetFuture = opts.targetFuture || 'futureEvents';

  return function (files, metalsmith, done){
    debug('events module started with %s events', events.length);

    const data = metalsmith.metadata();

    data[opts.targetPast] = data[opts.targetPast] || [];
    data[opts.targetFuture] = data[opts.targetFuture] || [];

    var now = new Date();
    now.setHours(0);

    events.forEach(function(event) {
      event.timestamp = (new Date(event.date)).getTime();
      event.monthDate = moment(event.timestamp).format('MMM Y');
    });
    events
      .filter(function(event) {
        if (!event.timestamp) { debug('filtering out event due to bad timestamp (date=%s)', event.date); }
        return event.timestamp;
      })
      .sort(function(a, b) {
        a.timestamp = a.timestamp || (new Date(a.date)).getTime();
        b.timestamp = b.timestamp || (new Date(b.date)).getTime();

        return (a.timestamp - b.timestamp);
      });

    events.forEach(function(event) {
      if (event.timestamp >= now.getTime()) {
        data[opts.targetFuture].push(event);
      } else {
        data[opts.targetPast].push(event);
      }
    });

    debug('Events processed...');
    debug('  there are %s upcoming', data[opts.targetFuture].length);
    debug('  there are %s past', data[opts.targetPast].length);

    done();
  };

}
