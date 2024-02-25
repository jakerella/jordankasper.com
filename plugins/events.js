
const moment = require('moment');
const logger = require('./_logger')();
const events = require('../assets/events.json').events;

module.exports = function eventPlugin(opts){
  opts.targetPast = opts.targetPast || 'pastEvents';
  opts.targetFuture = opts.targetFuture || 'futureEvents';

  return function (files, metalsmith, done){
    logger.debug(`events module started with ${events.length} events`);

    const data = metalsmith.metadata();

    data[opts.targetPast] = data[opts.targetPast] || [];
    data[opts.targetFuture] = data[opts.targetFuture] || [];

    const now = new Date();
    now.setHours(0);

    events.forEach(function(event) {
      event.timestamp = (new Date(event.date)).getTime();
      event.monthDate = moment(event.timestamp).format('MMM Y');
    });
    const sortedEvents = events
      .filter(function(event) {
        if (!event.timestamp) { logger.warn('filtering out event due to bad timestamp - date=', event.date); }
        return event.timestamp;
      })
      .sort(function(a, b) {
        a.timestamp = a.timestamp || (new Date(a.date)).getTime();
        b.timestamp = b.timestamp || (new Date(b.date)).getTime();

        return (b.timestamp - a.timestamp);
      });

    sortedEvents.forEach(function(event) {
      if (event.timestamp >= now.getTime()) {
        data[opts.targetFuture].push(event);
      } else {
        data[opts.targetPast].push(event);
      }
    });

    logger.info('Events processed...');
    logger.info(`  there are ${data[opts.targetFuture].length} upcoming`);
    logger.info(`  there are ${data[opts.targetPast].length} past`);

    done();
  };

}
