;(async function () {
    const RECENT_CACHE_KEY = 'jk-recent'
    const CACHE_LIMIT = (1000 * 60 * 60)

    if (window.NO_TRACK === true) { return }
    let fp = null
    if (FingerprintJS) {
        fp = (await (await FingerprintJS.load()).get()).visitorId
    } else {
        const userData =new TextEncoder().encode(navigator.userAgent + navigator.language + navigator.deviceMemory + navigator.deviceConcurrency)
        const digest = await crypto.subtle.digest('SHA-1', userData)
        fp = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('')
    }

    const visitor = {
        id: fp,
        ua: navigator.userAgent,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    const hit = {
        p: window.errorCode || window.location.pathname || '/',
        q: ((window.errorCode) ? `?errorMessage=${window.errorMessage}` : window.location.search) || '',
        r: document.referrer?.replace(window.location.origin, ''),
        t: Date.now()
    }

    // Prevent quick (1 hour) refreshes or re-visits from triggering more page views
    const [recentFP, recentHitsHash] = (localStorage.getItem(RECENT_CACHE_KEY) || '|').split('|')
    if (recentFP && recentFP !== fp) { return }

    const recentHits = (atob(recentHitsHash) || '')
        .split(';')
        .map(r => r.split('|'))
        .filter(r => {
            return (Date.now() - Number(r[1])) < CACHE_LIMIT
        })
    
    const recentMatch = recentHits.filter(r => r[0] === hit.p)
    if (recentMatch.length) {
        storeRecent(recentHits, hit.p)
        return
    }

    await fetch(`/.netlify/functions/processVisit?data=${btoa(JSON.stringify({ v: visitor, h: hit }))}`)
    storeRecent(recentHits, hit.p)

    function storeRecent(current, path) {
        let found = false
        recentHits.forEach(r => {
            if (r[0] === path) {
                r[1] = Date.now()
                found = true
            }
        })
        if (!found) {
            current.push([path, Date.now()])
        }
        localStorage.setItem(RECENT_CACHE_KEY, `${fp}|${btoa(current.map(r => `${r[0]}|${r[1]}`).join(';'))}`)
    }
})();