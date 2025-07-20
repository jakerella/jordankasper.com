
const blobs = require('@netlify/blobs')
const countries = require('../countries.json')

const c = require('../constants.json')
const ONE_DAY = (1000 * 60 * 60 * 24)
const ONE_WEEK_AGO = (ONE_DAY * 6)

module.exports = { handler }


async function handler(req, context) {
    try {
        let start = Number(req.queryStringParameters.start)
        if ((!start || start < 0) && req.queryStringParameters.start) {
            start = (new Date(req.queryStringParameters.start)).getTime()
        }
        if (!start) {
            start = Date.now() - ONE_WEEK_AGO
        }
        let end = Number(req.queryStringParameters.end)
        if ((!end || end < 0) && req.queryStringParameters.end) {
            end = (new Date(req.queryStringParameters.end)).getTime()
        }
        if (!end) {
            end = Date.now()
        }

        if (start > end) {
            start = end
        }

        const store = blobs.getStore({
            name: c.ANALYTICS_STORE,
            siteID: process.env.NETLIFY_SITE_ID || undefined,
            edgeURL: process.env.NETLIFY_EDGE_URL || undefined,
            token: process.env.NETLIFY_BLOBS_TOKEN || undefined
        })

        const visitors = (await store.get(c.VISITORS_KEY, { type: 'json' })) || {}
        const paths = (await store.get(c.PATHS_KEY, { type: 'json' })) || {}

        for (let fp in visitors) {
            // TODO: move this processing to front end to improve server function efficiency?
            visitors[fp].f = (new Date(visitors[fp].f * 1000)).toISOString().split('T')[0]
            visitors[fp].l = (new Date(visitors[fp].l * 1000)).toISOString().split('T')[0]
        }

        const hits = {}
        for (let t=start; t<=end; t+=ONE_DAY) {
            const keyDate = (new Date(t)).toISOString().split('T')[0]
            console.log(`Getting hits from ${keyDate}`)
            hits[keyDate] = (await store.get(c.HITS_KEY_PREFIX + keyDate, { type: 'json' })) || {}
        }

        // TODO: now we just need to make this data useful. ;)

        return { statusCode: 200, body: JSON.stringify({
            start,
            end,
            visitors,
            paths,
            hits
        }) }

    } catch(err) {
        console.error(`Hit catch all block: ${err.message || err.toString()}`)
        return { statusCode: 500, body: 'Unable to retrieve analytic data' }
    }
}
