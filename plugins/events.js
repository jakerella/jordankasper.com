
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
    data.eventStats = {};

    const now = new Date();
    now.setHours(0);

    data.eventStats.totalEvents = 0;
    data.eventStats.totalTalks = 0;
    data.eventStats.byYear = {};
    data.eventStats.byLoc = {};
    data.eventStats.locationCount = 0;
    data.eventStats.byTopic = { JavaScript: 0, 'Node.js': 0, Git: 0, Testing: 0, DevOps: 0, HTML: 0, RegEx: 0, OpenSource: 0, Other: 0 };

    events.forEach(function(event) {
      event.timestamp = (new Date(event.date)).getTime();
      event.monthDate = moment(event.timestamp).format('MMM Y');
      const year = moment(event.timestamp).format('Y');

      data.eventStats.totalEvents++
      if (!data.eventStats.byYear[year]) { data.eventStats.byYear[year] = 0; }
      data.eventStats.byYear[year]++;
      if (!data.eventStats.byLoc[event.location]) {
        data.eventStats.byLoc[event.location] = 0;
        data.eventStats.locationCount++;
      }
      data.eventStats.byLoc[event.location]++;

      event.topics.forEach(function(t) {
        data.eventStats.totalTalks++

        let covered = false;
        const title = t.toLowerCase();
        if (title.includes('javascript') || title.includes('es6') || title.includes('ajax') || title.includes('async') || title.includes('winjs') || title.includes('generator')) {
          data.eventStats.byTopic.JavaScript++;
          covered = true;
        }
        if (title.includes('node') || title.includes('loopback')) {
          data.eventStats.byTopic['Node.js']++;
          data.eventStats.byTopic.JavaScript++;
          covered = true;
        }
        if (title.includes('git')) {
          data.eventStats.byTopic.Git++;
          covered = true;
        }
        if (title.includes('test') || title.includes('mock')) {
          data.eventStats.byTopic.Testing++;
          covered = true;
        }
        if (title.includes('devops') || title.includes('grunt') || title.includes('workflow')) {
          data.eventStats.byTopic.DevOps++;
          covered = true;
        }
        if (title.includes('html') || title.includes('web site')) {
          data.eventStats.byTopic.HTML++;
          covered = true;
        }
        if (title.includes('regular expression') || title.includes('regex')) {
          data.eventStats.byTopic.RegEx++;
          covered = true;
        }
        if (title.includes('open source') || title.includes('open sourcing')) {
          data.eventStats.byTopic.OpenSource++;
          covered = true;
        }
        
        if (!covered) {
          data.eventStats.byTopic.Other++;
        }
      });
    });
    data.eventStats.byLoc.Virtual = data.eventStats.byLoc['(Virtual)'];
    delete data.eventStats.byLoc['(Virtual)'];

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
