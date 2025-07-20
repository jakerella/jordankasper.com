
import { getStore } from '@netlify/blobs'

import c from '../constants.json'

const ONE_DAY = (1000 * 60 * 60 * 24)
const ONE_WEEK_AGO = (ONE_DAY * 6)


export default async function handler(req, context) {
    try {
        const queryParams = {}
        ;(req.url.split('?')[1] || '').split('&').forEach((param) => {
            const parts = param.split('=')
            queryParams[parts[0]] = parts[1]
        })
        
        let start = Number(queryParams.start)
        if ((!start || start < 0) && queryParams.start) {
            start = (new Date(queryParams.start)).getTime()
        }
        if (!start) {
            start = Date.now() - ONE_WEEK_AGO
        }
        let end = Number(queryParams.end)
        if ((!end || end < 0) && queryParams.end) {
            end = (new Date(queryParams.end)).getTime()
        }
        if (!end) {
            end = Date.now()
        }

        if (start > end) {
            start = end
        }

        const store = getStore({
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
            hits[keyDate] = (await store.get(c.HITS_KEY_PREFIX + keyDate, { type: 'json' })) || {}
        }

        return new Response(JSON.stringify({
            start,
            end,
            visitors,
            paths,
            hits
        }), { status: 200 })

    } catch(err) {
        console.error(`Hit catch all block: ${err.message || err.toString()}\n${err.stack.split('\n')[1]}`)
        return new Response('Unable to retrieve analytic data', { status: 500 })
    }
}
