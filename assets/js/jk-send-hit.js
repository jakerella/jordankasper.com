;(async function () {
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
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    const hit = {
        p: window.errorCode || window.location.pathname || '/',
        q: ((window.errorCode) ? `?errorMessage=${window.errorMessage}` : window.location.search) || '',
        r: document.referrer?.replace(window.location.origin, ''),
        t: Date.now()
    }

    // Prevent quick (1 hour) refreshes or visits from triggering more page views
    const [lastFp, lastPath, lastTs] = (localStorage.getItem('jk-last') || '|').split('|')
    if (lastFp === fp && lastPath && hit.p && (Date.now() - Number(lastTs)) < (1000 * 60 * 60)) {
        console.debug('I was just here', new Date(Number(lastTs)))
        return
    }

    await fetch(`/.netlify/functions/processVisit?data=${btoa(JSON.stringify({ v: visitor, h: [hit] }))}`)

    localStorage.setItem('jk-last', `${fp}|${hit.p}|${Date.now()}`)
})();