
import { randomInt } from 'node:crypto'
import { getStore } from '@netlify/blobs'
import { UAParser } from 'ua-parser-js'
import { Bots } from 'ua-parser-js/extensions'

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
 *       ua: String,  // the user agent string of the browser
 *       tz: String   // device timezone as text (i.e. "America/New_York")
 *     },
 *     h: {           // The hit on the website
 *       p: String,   // the pathname for the hit
 *       t: Number,   // the timestamp of the hit
 *       q: String,   // the query string (optional)
 *       r: String    // the referral URL (optional)
 *     }
 *   }
 * 
 * @param {*} req The HTTP Request object from Netlify
 * @param {*} context The Netlify context
 * @returns Response
 */
export default async function handler(req, context) {
    try {
        const analytics = await extractRequestData(req.url.split('?data=')[1] || null, context)
        if (!analytics) {
            return new Response('Invalid analytic data payload', { status: 500 })
        }

        const store = getStore({ name: c.ANALYTICS_STORE })

        const visitor = await updateVisitorData(analytics, store)

        const result = await updatePageHits(analytics, visitor, store)
        if (!result) {
            return { statusCode: 500, body: 'Unable to save analytic data' }
        }
        return new Response('success', { status: 200 })

    } catch(err) {
        console.error(`Hit catch all block: ${err.message || err.toString()}\n${err.stack.split('\n')[1]}`)
        return new Response('Unable to save analytic data', { status: 500 })
    }
}

async function extractRequestData(queryParam, context) {
    if (!queryParam) { return null }

    let data = {}
    try {
        data = JSON.parse(atob(queryParam))
    } catch (err) {
        console.warn(`Unable to parse analytic data in query string: ${err.message || err}`)
        return null
    }

    if (!data.v || !data.v.id || !data.h) {
        return null
    }

    // if (context.geo && context.geo.country) {
    //     data.v.g = context.geo.country.code
    // } else {
        data.v.g = getCountryFromTZ(data.v.tz || '')
    // }
    
    if (data.h.p === '') { data.h.p = '/' }
    if (!data.h.p) { return null }

    if (!/^[3-5]\d\d$/.test(data.h.p)) {
        const resp = await fetch(`${context.site.url}/sitemap.xml`)
        if (resp.status === 200) {
            const locations = (await resp.text()).match(/\<loc\>[^\<]+\<\/loc\>/ig)
            const paths = locations.map(l => l.replace(/\<\/?loc\>/g, '').replace(/^https?:\/\/[^\/]+/, ''))
            if (!paths.includes(data.h.p)) {
                console.warn(`Invalid path sent to hit tracker: ${data.h.p.replace(/[^a-z0-9\/\?%=&-\.]/ig, '?')}`)
                return null
            }
        }
    }
    
    if (data.h.q) {
        const q = []
        data.h.q.split('?')[1]?.split('&').forEach((p) => {
            const [k, v] = p.split('=')
            if (TRACKED_SEARCH_PARAMS.includes(k)) {
                q.push(decodeURIComponent(v).replaceAll(/\+/g, ' '))
            }
        })
        data.h.q = q.join('; ')
    }

    return data
}

async function updateVisitorData(analytics, store) {
    const visitors = (await store.get(c.VISITORS_KEY, { type: 'json' })) || {}
    if (!visitors[analytics.v.id]) {
        visitors[analytics.v.id] = {}
    }
    
    visitors[analytics.v.id].g = (analytics.v.g) ? analytics.v.g : (visitors[analytics.v.id].g || 0)
    if (!visitors[analytics.v.id].f) { visitors[analytics.v.id].f = Math.floor(analytics.h.t / 1000) }
    visitors[analytics.v.id].l = Math.floor(analytics.h.t / 1000)
    const parser = (new UAParser(Bots)).setUA(analytics.v.ua).getResult()
    const entry = [parser.browser.name, parser.os.name, parser.device.type]
    if (['crawler', 'fetcher'].includes(parser.browser.type)) {
        entry[2] = 'bot'
    } else if (['windows', 'macos', 'linux'].includes((entry[1] || '').toLowerCase())) {
        entry[2] = 'desktop'
    }
    visitors[analytics.v.id].u = entry.join('|')

    const result = await store.setJSON(c.VISITORS_KEY, visitors)
    if (!result) {
        console.warn(`unable to update visitor data in blobs for ${analytics.v.id}, will try to update analytics anyway...`)
        return null
    }
    return visitors[analytics.v.id]
}

async function updatePageHits(analytics, visitor, store) {
    const pathIndex = (await store.get(c.PATHS_KEY, { type: 'json' })) || {}
    const dateKey = c.HITS_KEY_PREFIX + (new Date(Number(analytics.h.t))).toISOString().split('T')[0]
    const hitsByDate = (await store.get(dateKey, { type: 'json' })) || {}

    let pathId = pathIndex[analytics.h.p]
    if (!pathId) {
        pathId = generatePathKey(pathIndex)
        pathIndex[analytics.h.p] = pathId
        const result = await store.setJSON(c.PATHS_KEY, pathIndex)
        if (!result) {
            console.error(`unable to update path index in blobs for ${analytics.h.p}`)
            return false
        }
    }

    if (!hitsByDate[pathId]) {
        hitsByDate[pathId] = { h: 0, b: 0, v: [], q: [], r: [] }
    }
    if (/\|\|bot$/.test(visitor.u)) {
        hitsByDate[pathId].b++
    } else {
        hitsByDate[pathId].h++
        if (!hitsByDate[pathId].v.includes(analytics.v.id)) {
            hitsByDate[pathId].v.push(analytics.v.id)
        }
        if (analytics.h.q && !hitsByDate[pathId].q.includes(analytics.h.q)) {
            hitsByDate[pathId].q.push(analytics.h.q)
        }
        if (analytics.h.r && !hitsByDate[pathId].r.includes(analytics.h.r)) {
            hitsByDate[pathId].r.push(analytics.h.r)
        }
    }
    
    try {
        const result = await store.setJSON(dateKey, hitsByDate)
        if (!result) {
            console.error(`unable to update analytics data for${dateKeysUpdated[i]}`)
            return false
        }
    } catch(err) {
        console.error(`unable to update analytics data for${dateKeysUpdated[i]}: ${err.message || err}`)
        return false
    }

    return true
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
