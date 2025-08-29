;(async function () {

    // TODO: if the date range is too large, roll up data
    // TODO: cache data for dates in the past (localStorage)

    const LOCAL_KEY = 'jk-stats-cache'
    const ONE_WEEK_AGO = (new Date(Date.now() - (1000 * 60 * 60 * 24 * 6))).toISOString().split('T')[0]
    let currentChart = null

    document.addEventListener('DOMContentLoaded', async () => {
        $('#start-date').attr('max', (new Date()).toISOString().split('T')[0])[0].valueAsDate = new Date(ONE_WEEK_AGO)
        $('#end-date').attr('max', (new Date()).toISOString().split('T')[0])[0].valueAsDate = new Date()

        $('#change-range').on('click', async () => {
            const start = $('#start-date').val()
            const end = $('#end-date').val()
            if (currentChart) {
                currentChart.destroy()
                currentChart = null
            }
            loadPage(start, end)
        })

        $('#expand-chart').on('click', (e) => {
            $('.site-analytics').removeClass('analytics-container')
            e.target.parentNode.removeChild(e.target)
        })

        
        // Initial page load with default date range
        await loadPage()
    })

    async function loadPage(start=null, end=null) {
        start = start || ONE_WEEK_AGO
        end = end || ''
        
        let data = {}
        try {
            const resp = await fetch(`/.netlify/functions/retrieveStats?start=${start}&end=${end}`)
            if (resp.status > 299) {
                throw new Error(`Unable to retrieve analytics (${resp.status})`)
            } else {
                data = await resp.json()
                data.pathsById = {}
                Object.keys(data.paths).forEach((p) => data.pathsById[data.paths[p]] = p)
            }

            if (!data) {
                return showMessage('No data was returned when retrieving analytics', 'error')
            }
        } catch(err) {
            return showMessage(err.message, 'error')
        }

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
                if (!data.pathsById[pathId]) { return }
                if (!dataByPath[pathId]) {
                    dataByPath[pathId] = {
                        path: data.pathsById[pathId],
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
                visitorStats.paths.add(data.pathsById[pathId])

                data.hits[d][pathId].v.forEach((v) => {
                    if (data.visitors[v]) {
                        if (data.visitors[v].f < d) {
                            visitorStats.returns.add(v)
                        }
                        visitorStats.geoStats[data.visitors[v].g].paths.add(pathId)
                    }
                })

                data.hits[d][pathId].r.forEach((r) => {
                    if (!dataByReferrer[r]) {
                        dataByReferrer[r] = { visitors: new Set(), paths: new Set() }
                    }
                    dataByReferrer[r].visitors = dataByReferrer[r].visitors.union(pathVisitors)
                    dataByReferrer[r].paths.add(data.pathsById[pathId])
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

        currentChart = new Chart($('#stats-by-time')[0], {
            type: 'line',
            data: { labels: viewVisitorChartLabels, datasets: viewVisitorChartDatasets },
            options: { scales: { y: { beginAtZero: true } } }
        })


        let tableRows = []
        let stripe = false
        Object.keys(dataByPath)
            .sort((a, b) => dataByPath[b].visitors.size - dataByPath[a].visitors.size)
            .forEach((pathId) => {
                tableRows.push(`<tr class='${(stripe) ? 'stripe' : ''}'>
                    <td>${dataByPath[pathId].path}</td>
                    <td>${dataByPath[pathId].hits}</td>
                    <td>${dataByPath[pathId].visitors.size}</td>
                    <td>${dataByPath[pathId].referrers.values().toArray().join('<br>')}</td>
                    <!-- <td>${dataByPath[pathId].queries.values().toArray().join('<br>')}</td> -->
                </tr>`)
                stripe = !stripe
            })
        $('#stats-by-path tbody').html(tableRows.join('\n'))


        tableRows = []
        stripe = false
        Object.keys(dataByReferrer)
            .sort((a, b) => dataByReferrer[b].visitors.size - dataByReferrer[a].visitors.size)
            .forEach((referrer) => {
                tableRows.push(`<tr class='${(stripe) ? 'stripe' : ''}'>
                    <td>${referrer}</td>
                    <td>${dataByReferrer[referrer].visitors.size}</td>
                    <td>${dataByReferrer[referrer].paths.size}</td>
                </tr>`)
                stripe = !stripe
            })
        $('#stats-by-referrer tbody').html(tableRows.join('\n'))


        // tableRows = []
        // for (let query in dataByQuery) {
        //     tableRows.push(`<tr>
        //         <td>${query}</td>
        //         <td>${dataByQuery[query].count}</td>
        //         <td>${dataByQuery[query].visitors.size}</td>
        //     </tr>`)
        // }
        // $('#stats-by-query tbody').html(tableRows.join('\n'))

        
        $('.total-unique').html(Object.keys(data.visitors).length)
        $('.range-unique').html(visitorStats.unique.size)
        $('.return-visits').html(visitorStats.returns.size)
        $('.pages-viewed').html(visitorStats.paths.size)

        tableRows = []
        stripe = false
        const countryTweaks = {
            'UK': 'GB'
        }
        Object.keys(visitorStats.geoStats)
            .sort((a, b) => visitorStats.geoStats[b].visitorCount - visitorStats.geoStats[a].visitorCount)
            .forEach((country) => {
                const code = (countryTweaks[country]) ? countryTweaks[country] : country
                tableRows.push(`<tr class='${(stripe) ? 'stripe' : ''}'>
                    <td>
                        <img src='https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${code.toLowerCase()}.svg' alt='Country: ${country}'>
                        ${country}
                    </td>
                    <td>${visitorStats.geoStats[country].visitorCount}</td>
                    <td>${visitorStats.geoStats[country].paths.size}</td>
                </tr>`)
                stripe = !stripe
            })
        $('#visitor-geography tbody').html(tableRows.join('\n'))
    }

    function showMessage(text, className='error') {
        $('h2').after(`<p class='${className}-message'>${text}</p>`)
    }

})();