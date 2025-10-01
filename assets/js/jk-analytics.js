;(async function () {

    // TODO: if the date range is too large, roll up data (on server?)

    const ONE_WEEK_AGO = (new Date(Date.now() - (1000 * 60 * 60 * 24 * 6))).toISOString().split('T')[0]
    let charts = {}

    document.addEventListener('DOMContentLoaded', async () => {
        $('#start-date').attr('max', (new Date()).toISOString().split('T')[0])[0].valueAsDate = new Date(ONE_WEEK_AGO)
        $('#end-date').attr('max', (new Date()).toISOString().split('T')[0])[0].valueAsDate = new Date()

        $('#change-range').on('click', async () => {
            const start = $('#start-date').val()
            const end = $('#end-date').val()
            if (Object.keys(charts).length) {
                Object.keys(charts).forEach(c => charts[c].destroy())
                charts = {}
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

        // For charts
        const viewVisitorChartLabels = []
        const viewVisitorChartDatasets = [
            { label: 'Page Views', data: [] },
            { label: 'Bot Hits', data: [] },
            { label: 'Unique Visitors', data: [] }
        ]
        const allTimeGeography = {}
        const userBrowsers = {}
        const operatingSystems = {}
        const deviceTypes = {}
        const bots = {}

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
            if (data.visitors[fp].g && !/\|bot$/.test(data.visitors[fp].u)) {
                if (!allTimeGeography[data.visitors[fp].g]) {
                    allTimeGeography[data.visitors[fp].g] = 0
                }
                allTimeGeography[data.visitors[fp].g]++
            }

            if (!visitorStats.geoStats[data.visitors[fp].g]) {
                visitorStats.geoStats[data.visitors[fp].g] = {
                    visitorCount: 0,
                    paths: new Set()
                }
            }

            visitorStats.geoStats[data.visitors[fp].g].visitorCount++

            if (data.visitors[fp].u && data.visitors[fp].u != '||') {
                let deviceData = data.visitors[fp].u.split('|')
                if (deviceData[2] === 'bot') {
                    if (!bots[deviceData[0]]) { bots[deviceData[0]] = 0 }
                    bots[deviceData[0]]++
                } else {
                    deviceData = deviceData.map(d => d || 'other')

                    if (!userBrowsers[deviceData[0]]) { userBrowsers[deviceData[0]] = 0 }
                    userBrowsers[deviceData[0]]++

                    if (!operatingSystems[deviceData[1]]) { operatingSystems[deviceData[1]] = 0 }
                    operatingSystems[deviceData[1]]++

                    if (!deviceTypes[deviceData[2]]) { deviceTypes[deviceData[2]] = 0 }
                    deviceTypes[deviceData[2]]++
                }
            }
        }
        
        const dates = Object.keys(data.hits).sort((a, b) => { (a < b) ? -1 : 1 })
        dates.forEach((d) => {
            viewVisitorChartLabels.push(d)
            let chartViews = 0
            let chartBots = 0
            let chartVisitors = new Set()

            Object.keys(data.hits[d]).forEach((pathId) => {
                if (!data.pathsById[pathId]) { return }
                if (!dataByPath[pathId]) {
                    dataByPath[pathId] = {
                        path: data.pathsById[pathId],
                        hits: 0,
                        bots: 0,
                        visitors: new Set(),
                        referrers: new Set(),
                        queries: new Set()
                    }
                }

                const pathVisitors = new Set(data.hits[d][pathId].v)
                chartViews += data.hits[d][pathId].h
                chartBots += data.hits[d][pathId].b || 0
                chartVisitors = chartVisitors.union(pathVisitors)
                dataByPath[pathId].hits += data.hits[d][pathId].h
                dataByPath[pathId].bots += data.hits[d][pathId].b || 0
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
            viewVisitorChartDatasets[1].data.push(chartBots)
            viewVisitorChartDatasets[2].data.push(chartVisitors.size)
        })


        // ******************************
        // Build out the UI elements
        // ******************************

        charts['viewsAndVisitors'] = new Chart($('#stats-by-time canvas')[0], {
            type: 'line',
            data: { labels: viewVisitorChartLabels, datasets: viewVisitorChartDatasets },
            options: { scales: { y: { beginAtZero: true } } }
        })

        let tableRows = []
        let stripe = false
        Object.keys(dataByReferrer)
            .sort((a, b) => dataByReferrer[b].visitors.size - dataByReferrer[a].visitors.size)
            .forEach((referrer) => {
                if (dataByReferrer[referrer].paths.has(referrer)) {
                    return
                }
                tableRows.push(`<tr class='${(stripe) ? 'stripe' : ''}'>
                    <td>${referrer}</td>
                    <td>${dataByReferrer[referrer].visitors.size}</td>
                    <td>${dataByReferrer[referrer].paths.size}</td>
                </tr>`)
                stripe = !stripe
            })
        $('#stats-by-referrer tbody').html(tableRows.join('\n'))
        
        $('.total-unique').html(Object.keys(data.visitors).length)
        $('.range-unique').html(visitorStats.unique.size)
        $('.return-visits').html(visitorStats.returns.size)
        $('.pages-viewed').html(visitorStats.paths.size)

        const geoLabels = []
        const geoValues = []
        Object.keys(allTimeGeography).forEach(k => {
            geoLabels.push(k)
            geoValues.push(allTimeGeography[k])
        })
        charts['AllTimeGeography'] = new Chart($('#geography-all')[0], {
            type: 'pie',
            options: { plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    position: 'nearest',
                    external: geoToolTip
                }
            } },
            data: { labels: geoLabels, datasets: [{ label: 'Visitor Location', data: geoValues }] }
        })

        const rangedGeoLabels = []
        const rangedGeoValues = []
        Object.keys(visitorStats.geoStats).forEach(k => {
            rangedGeoLabels.push(k)
            rangedGeoValues.push(visitorStats.geoStats[k].paths.size)
        })
        charts['RangedGeography'] = new Chart($('#geography-ranged-views')[0], {
            type: 'pie',
            options: { plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    position: 'nearest',
                    external: geoToolTip
                }
            } },
            data: { labels: rangedGeoLabels, datasets: [{ label: 'Visitor Location', data: rangedGeoValues }] }
        })

        // tableRows = []
        // stripe = false
        // const countryTweaks = {
        //     'UK': 'GB'
        // }
        // Object.keys(visitorStats.geoStats)
        //     .sort((a, b) => visitorStats.geoStats[b].visitorCount - visitorStats.geoStats[a].visitorCount)
        //     .forEach((country) => {
        //         const code = (countryTweaks[country]) ? countryTweaks[country] : country
        //         tableRows.push(`<tr class='${(stripe) ? 'stripe' : ''}'>
        //             <td>
        //                 <img src='https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${code.toLowerCase()}.svg' alt='Country: ${country}'>
        //                 ${country}
        //             </td>
        //             <td>${visitorStats.geoStats[country].visitorCount}</td>
        //             <td>${visitorStats.geoStats[country].paths.size}</td>
        //         </tr>`)
        //         stripe = !stripe
        //     })
        // $('#visitor-geography tbody').html(tableRows.join('\n'))
        

        const browserLabels = []
        const browserValues = []
        Object.keys(userBrowsers).forEach(k => {
            browserLabels.push(k)
            browserValues.push(userBrowsers[k])
        })
        charts['browsers'] = new Chart($('#user-browsers')[0], {
            type: 'pie',
            options: { plugins: { legend: { display: false } } },
            data: { labels: browserLabels, datasets: [{ label: 'User Browsers', data: browserValues }] }
        })

        const osLabels = []
        const osValues = []
        Object.keys(operatingSystems).forEach(k => {
            osLabels.push(k)
            osValues.push(operatingSystems[k])
        })
        charts['browsers'] = new Chart($('#operating-systems')[0], {
            type: 'pie',
            options: { plugins: { legend: { display: false } } },
            data: { labels: osLabels, datasets: [{ label: 'Operating Systems', data: osValues }] }
        })

        const deviceLabels = []
        const deviceValues = []
        Object.keys(deviceTypes).forEach(k => {
            deviceLabels.push(k)
            deviceValues.push(deviceTypes[k])
        })
        charts['browsers'] = new Chart($('#device-types')[0], {
            type: 'pie',
            options: { plugins: { legend: { display: false } } },
            data: { labels: deviceLabels, datasets: [{ label: 'Device Types', data: deviceValues }] }
        })

        const botLabels = []
        const botValues = []
        Object.keys(bots).forEach(k => {
            botLabels.push(k)
            botValues.push(bots[k])
        })
        charts['bots'] = new Chart($('#bot-visitors')[0], {
            type: 'pie',
            options: { plugins: { legend: { display: false } } },
            data: { labels: botLabels, datasets: [{ label: 'Bots', data: botValues }] }
        })

        tableRows = []
        stripe = false
        Object.keys(dataByPath)
            .sort((a, b) => dataByPath[b].visitors.size - dataByPath[a].visitors.size)
            .forEach((pathId) => {
                const filteredReferrers = dataByPath[pathId].referrers.values().toArray().filter((ref) => {
                    return dataByPath[pathId].path !== ref
                })
                tableRows.push(`<tr class='${(stripe) ? 'stripe' : ''}'>
                    <td><a href='${dataByPath[pathId].path}'>${dataByPath[pathId].path}</a></td>
                    <td>${dataByPath[pathId].hits}</td>
                    <td>${dataByPath[pathId].visitors.size}</td>
                    <td>${dataByPath[pathId].bots}</td>
                    <td>${filteredReferrers.join('<br>')}</td>
                    <td>${dataByPath[pathId].queries.values().toArray().join('<br>')}</td>
                </tr>`)
                stripe = !stripe
            })
        $('#stats-by-path tbody').html(tableRows.join('\n'))
    }

    function showMessage(text, className='error') {
        $('h2').after(`<p class='${className}-message'>${text}</p>`)
    }

    function geoToolTip(context) {
        const { chart, tooltip } = context

        let tooltipEl = chart.canvas.parentNode.querySelector(`#geo-tooltip-${chart.id}`)
        if (!tooltipEl) {
            tooltipEl = document.createElement('aside')
            tooltipEl.setAttribute('id', `geo-tooltip-${chart.id}`)
            tooltipEl.classList.add('geo-tooltip')
            chart.canvas.parentNode.appendChild(tooltipEl)
        }
        if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = 0
            return
        }

        // TODO: cache the img elements so we don't constantly request it
        tooltipEl.innerHTML = `<p><img class='geo-flag-icon' src='https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${tooltip.title[0].toLowerCase()}.svg' alt='flag icon for ${tooltip.title[0]}'> ${tooltip.dataPoints[0].raw}</p>`

        const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas
        tooltipEl.style.opacity = 1
        tooltipEl.style.left = positionX + tooltip.caretX + 'px'
        tooltipEl.style.top = positionY + tooltip.caretY + 'px'
    }

})();