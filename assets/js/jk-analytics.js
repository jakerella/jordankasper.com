;(async function () {

    const ONE_WEEK_AGO = (new Date(Date.now() - (1000 * 60 * 60 * 24 * 6))).toISOString().split('T')[0]    

    const resp = await fetch(`/.netlify/functions/retrieveStats?start=${ONE_WEEK_AGO}`)
    if (resp.status > 299) {
        $('.site-analytics').append(`<p>
            Error (${resp.status}):<br>
            ${await resp.text()}
        </p>`)
    }

    const data = await resp.json()

    const pathsById = {}
    Object.keys(data.paths).forEach((p) => pathsById[data.paths[p]] = p)
    console.log('analytics:', data, pathsById)

    // TODO: if the date range is too large, roll up data


    // ******************************
    // Gather up the data
    // ******************************

    // For views/visitors chart
    const viewVisitorChartLabels = []
    const viewVisitorChartDatasets = [
        { label: 'Page Views', data: [] },
        { label: 'Unique Visitors', data: [] }
    ]
    // For other tables
    const dataByPath = {}
    const dataByReferrer = {}
    const dataByQuery = {}
    const visitorStats = {
        unique: new Set(),
        returns: new Set(),
        paths: new Set(),
        geoStats: {}
    }

    for (let fp in data.visitors) {
        if (!visitorStats.geoStats[data.visitors[fp].g]) {
            visitorStats.geoStats[data.visitors[fp].g] = {
                visitorCount: 0,
                paths: new Set()
            }
        }
        visitorStats.geoStats[data.visitors[fp].g].visitorCount++
    }
    
    const dates = Object.keys(data.hits).sort((a, b) => { (a < b) ? -1 : 1 })
    dates.forEach((d) => {
        viewVisitorChartLabels.push(d)
        let chartViews = 0
        let chartVisitors = new Set()

        Object.keys(data.hits[d]).forEach((pathId) => {
            if (!dataByPath[pathId]) {
                dataByPath[pathId] = {
                    path: pathsById[pathId],
                    hits: 0,
                    visitors: new Set(),
                    referrers: new Set(),
                    queries: new Set()
                }
            }

            const pathVisitors = new Set(data.hits[d][pathId].v)
            chartViews += data.hits[d][pathId].h
            chartVisitors = chartVisitors.union(pathVisitors)
            dataByPath[pathId].hits += data.hits[d][pathId].h
            dataByPath[pathId].visitors = dataByPath[pathId].visitors.union(pathVisitors)
            dataByPath[pathId].referrers = dataByPath[pathId].referrers.union(new Set(data.hits[d][pathId].r))
            dataByPath[pathId].queries = dataByPath[pathId].queries.union(new Set(data.hits[d][pathId].q))
            visitorStats.unique = visitorStats.unique.union(pathVisitors)
            visitorStats.paths.add(pathsById[pathId])

            data.hits[d][pathId].v.forEach((v) => {
                if (data.visitors[v].f < d) {
                    visitorStats.returns.add(v)
                }
                visitorStats.geoStats[data.visitors[v].g].paths.add(pathId)
            })

            data.hits[d][pathId].r.forEach((r) => {
                if (!dataByReferrer[r]) {
                    dataByReferrer[r] = { visitors: new Set(), paths: new Set() }
                }
                dataByReferrer[r].visitors = dataByReferrer[r].visitors.union(pathVisitors)
                dataByReferrer[r].paths.add(pathsById[pathId])
            })
            data.hits[d][pathId].q.forEach((q) => {
                if (!dataByQuery[q]) {
                    dataByQuery[q] = { count: 0, visitors: new Set() }
                }
                dataByQuery[q].visitors = dataByQuery[q].visitors.union(pathVisitors)
                dataByQuery[q].count += data.hits[d][pathId].h
            })
        })
        viewVisitorChartDatasets[0].data.push(chartViews)
        viewVisitorChartDatasets[1].data.push(chartVisitors.size)
    })


    // ******************************
    // Build out the UI elements
    // ******************************

    new Chart($('#stats-by-time')[0], {
        type: 'line',
        data: { labels: viewVisitorChartLabels, datasets: viewVisitorChartDatasets },
        options: { scales: { y: { beginAtZero: true } } }
    })


    let tableRows = []

    for (let pathId in dataByPath) {
        tableRows.push(`<tr>
            <td>${dataByPath[pathId].path}</td>
            <td>${dataByPath[pathId].hits}</td>
            <td>${dataByPath[pathId].visitors.size}</td>
            <td>${dataByPath[pathId].referrers.values().toArray().join('<br>')}</td>
            <td>${dataByPath[pathId].queries.values().toArray().join('<br>')}</td>
        </tr>`)
    }
    $('#stats-by-path tbody').html(tableRows.join('\n'))


    tableRows = []
    for (let referrer in dataByReferrer) {
        tableRows.push(`<tr>
            <td>${referrer}</td>
            <td>${dataByReferrer[referrer].visitors.size}</td>
            <td>${dataByReferrer[referrer].paths.size}</td>
        </tr>`)
    }
    $('#stats-by-referrer tbody').html(tableRows.join('\n'))


    tableRows = []
    for (let query in dataByQuery) {
        tableRows.push(`<tr>
            <td>${query}</td>
            <td>${dataByQuery[query].count}</td>
            <td>${dataByQuery[query].visitors.size}</td>
        </tr>`)
    }
    $('#stats-by-query tbody').html(tableRows.join('\n'))

    
    $('.total-unique').html(Object.keys(data.visitors).length)
    $('.range-unique').html(visitorStats.unique.size)
    $('.return-visits').html(visitorStats.returns.size)
    $('.pages-viewed').html(visitorStats.paths.size)

    tableRows = []
    const countryTweaks = {
        'UK': 'GB'
    }
    for (let country in visitorStats.geoStats) {
        const code = (countryTweaks[country]) ? countryTweaks[country] : country
        tableRows.push(`<tr>
            <td>
                <img src='https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${code.toLowerCase()}.svg' alt='Country: ${country}'>
                ${country}
            </td>
            <td>${visitorStats.geoStats[country].visitorCount}</td>
            <td>${visitorStats.geoStats[country].paths.size}</td>
        </tr>`)
    }
    $('#visitor-geography tbody').html(tableRows.join('\n'))

})();