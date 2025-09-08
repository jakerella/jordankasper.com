
import { randomInt } from 'node:crypto'
import { getStore } from '@netlify/blobs'

import timezones from '../timezones.json'
import c from '../constants.json'

const TRACKED_SEARCH_PARAMS = ['q', 'errorMessage']

/**
 * This is the main handler for the analytics processor. The Request object needs to have
 * a query param called "data" which contains a BASE64 ENCODED JSON OBJECT (stringified).
 * The structure of that JSON object is:
 *   {
 *     v: {           // the visitor for this analytic data set
 *       id: String,  // device fingerprint
 *       tz: String   // device timezone as text (i.e. "America/New_York")
 *     },
 *     h: [{          // an array fo the hits for from this device since the last analytic payload sent
 *       p: String,   // the pathname for the hit
 *       t: Number,   // the timestamp of the hit
 *       q: String,   // the query string (optional)
 *       r: String    // the referral URL (optional)
 *     }, ...]
 *   }
 * 
 * @param {*} req The HTTP Request object from Netlify
 * @param {*} context The Netlify context
 * @returns Response
 */
export default async function handler(req, context) {
    try {
        const analytics = extractRequestData(req.url.split('?data=')[1] || null, context)
        if (!analytics) {
            return new Response('Invalid analytic data payload', { status: 500 })
        }

        const store = getStore({ name: c.ANALYTICS_STORE })

        await updateVisitorData(analytics, store)

        const result = await updatePageHits(analytics, store)
        if (!result) {
            return { statusCode: 500, body: 'Unable to save analytic data' }
        }
        return new Response('success', { status: 200 })

    } catch(err) {
        console.error(`Hit catch all block: ${err.message || err.toString()}\n${err.stack.split('\n')[1]}`)
        return new Response('Unable to save analytic data', { status: 500 })
    }
}

function extractRequestData(queryParam, context) {
    if (!queryParam) { return null }

    let data = {}
    try {
        data = JSON.parse(atob(queryParam))
    } catch (err) {
        console.warn(`Unable to parse analytic data in query string: ${err.message || err}`)
        return null
    }
    
    if (!data.v || !data.v.id || !Array.isArray(data.h)) {
        return null
    }

    if (context.geo && context.geo.country) {
        data.v.g = context.geo.country.code
    } else {
        data.v.g = getCountryFromTZ(data.v.tz || '')
    }

    data.h = data.h
        .map((h) => {
            if (h.p === '') { h.p = '/' }
            if (h.q) {
                const q = []
                h.q.split('?')[1]?.split('&').forEach((p) => {
                    const [k, v] = p.split('=')
                    if (TRACKED_SEARCH_PARAMS.includes(k)) {
                        q.push(decodeURIComponent(v).replaceAll(/\+/g, ' '))
                    }
                })
                h.q = q.join('; ')
            }
            return h
        })
        .filter((h) => { return h.p && Number(h.t) && Number(h.t) > 0 })
    
    if (!data.h.length) {
        console.debug('No valid hits in analytic payload')
        return null
    }

    return data
}

async function updateVisitorData(analytics, store) {
    const visitors = (await store.get(c.VISITORS_KEY, { type: 'json' })) || {}
    if (!visitors[analytics.v.id]) {
        visitors[analytics.v.id] = {}
    }
    
    visitors[analytics.v.id].g = (analytics.v.g) ? analytics.v.g : (visitors[analytics.v.id].g || 0)
    let earliest = Date.now() + 1000
    let latest = 0
    analytics.h.forEach((h) => {
        if (h.t < earliest) { earliest = h.t }
        if (h.t > latest) { latest = h.t }
    })
    if (!visitors[analytics.v.id].f) { visitors[analytics.v.id].f = Math.floor(earliest / 1000) }
    visitors[analytics.v.id].l = Math.floor(latest / 1000)

    const result = await store.setJSON(c.VISITORS_KEY, visitors)
    if (!result) {
        console.warn(`unable to update visitor data in blobs for ${analytics.v.id}, will try to update analytics anyway...`)
    }
    return result
}

async function updatePageHits(analytics, store) {
    const hitsByDate = {}
    const dateKeysUpdated = []
    const pathIndex = (await store.get(c.PATHS_KEY, { type: 'json' })) || {}

    for (let i=0; i<analytics.h.length; ++i) {
        const dateKey = c.HITS_KEY_PREFIX + (new Date(Number(analytics.h[i].t))).toISOString().split('T')[0]
        if (!hitsByDate[dateKey]) {
            hitsByDate[dateKey] = (await store.get(dateKey, { type: 'json' })) || {}
        }
        let pathId = pathIndex[analytics.h[i].p]
        if (!pathId) {
            pathId = generatePathKey(pathIndex)
            pathIndex[analytics.h[i].p] = pathId
            const result = await store.setJSON(c.PATHS_KEY, pathIndex)
            if (!result) {
                console.error(`unable to update path index in blobs for ${analytics.h[i].p}`)
                return false
            }
        }

        if (!hitsByDate[dateKey][pathId]) {
            hitsByDate[dateKey][pathId] = { h: 0, v: [], q: [], r: [] }
        }
        hitsByDate[dateKey][pathId].h++
        if (!hitsByDate[dateKey][pathId].v.includes(analytics.v.id)) {
            hitsByDate[dateKey][pathId].v.push(analytics.v.id)
        }
        if (analytics.h[i].q && !hitsByDate[dateKey][pathId].q.includes(analytics.h[i].q)) {
            hitsByDate[dateKey][pathId].q.push(analytics.h[i].q)
        }
        if (analytics.h[i].r && !hitsByDate[dateKey][pathId].r.includes(analytics.h[i].r)) {
            hitsByDate[dateKey][pathId].r.push(analytics.h[i].r)
        }
        dateKeysUpdated.push(dateKey)
    }

    let allSucceeded = true
    for (let i=0; i<dateKeysUpdated.length; ++i) {
        try {
            const result = await store.setJSON(dateKeysUpdated[i], hitsByDate[dateKeysUpdated[i]])
            if (!result) {
                allSucceeded = false
                console.error(`unable to update analytics data for${dateKeysUpdated[i]}`)
            }
        } catch(err) {
            allSucceeded = false
            console.error(`unable to update analytics data for${dateKeysUpdated[i]}: ${err.message || err}`)
        }
    }

    return allSucceeded
}

function generatePathKey(paths) {
    const pathId = `p-${randomInt(1, 99999)}`
    if (paths[pathId]) {
        return generatePathKey(paths)
    }
    return pathId
}

function getCountryFromTZ(tz) {
    if (!tz) { return '?' }
    if (timezones[tz].length < 3) {
        return timezones[tz][0]
    } else if ( /\//.test(tz)) {
        return tz.split('/')[0]
    } else {
        return '?'
    }
}
