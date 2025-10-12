
;(() => {

    // TODO:
    // show hint (connection)
    // save player stats
    // dark mode
    // game timer (and save time?)
    // better node & label design
    // better UI overall
    // share result online
    // never allow multiple graphs in same puzzle (like 2 single-count nodes connected)

    const MAIN_ELEM = document.querySelector('main')
    const SHIELD_ELEM = document.getElementById('shield')
    const SNAPSHOT_ELEM = document.getElementById('snapshot')
    const GRAPH_ELEM = document.getElementById('graph')
    const EDGES_ELEM = document.getElementById('edges')
    const MSG_ELEM = document.getElementById('message')
    const NEW_GAME_ELEM = document.getElementById('new-game-screen')
    const WIN_DIALOG_ELEM = document.getElementById('win-screen')
    const LOCALSTORAGE_KEY = 'constellation'
    const MSG_TIMEOUT = 5000
    const MSG_FADEOUT = 2
    const MIN_NODE_SIZE = 7
    const NODE_MULTIPLIER = 4
    const NODE_PADDING = 40
    
    const LEVELS = [
        { name: 'Main Sequence', nodeCount: 5, edgeCount: [5, 10], weightRange: [2, 6] },
        { name: 'Bright Giant', nodeCount: 6, edgeCount: [6, 12], weightRange: [2, 7] },
        { name: 'Super Giant', nodeCount: 7, edgeCount: [7, 13], weightRange: [2, 8] },
        { name: 'Hyper Giant', nodeCount: 8, edgeCount: [8, 14], weightRange: [2, 9] }
    ]

    let GAME = null
    let MSG_TIMER = null
    let FULLSCREEN = false


    function main() {

        /*****************************************************/
        const currGame = localStorage.getItem(LOCALSTORAGE_KEY)
        if (currGame) {
            loadGame(currGame)
        } else {
            // TODO: determine level
            newGame(0)
        }
        /*****************************************************/


        /************* GAME EVENT HANDLERS *************/

        document.getElementById('fullscreen').addEventListener('click', () => {
            if (FULLSCREEN) {
                document.exitFullscreen().then(() => FULLSCREEN = false)
            } else {
                document.body.requestFullscreen().then(() => FULLSCREEN = true)
            }
        })

        document.getElementById('new').addEventListener('click', () => {
            if (GAME) {
                return showDialog(NEW_GAME_ELEM)
            }
            // TODO: determine level?
            newGame(0)
        })

        NEW_GAME_ELEM.querySelector('.cancel').addEventListener('click', () => {
            hideDialog(NEW_GAME_ELEM)
        })
        NEW_GAME_ELEM.querySelector('.new-game').addEventListener('click', () => {
            newGame(NEW_GAME_ELEM.querySelector('.level').value)
            hideDialog(NEW_GAME_ELEM)
        })

        WIN_DIALOG_ELEM.querySelector('.new-game').addEventListener('click', () => {
            if (GAME) {
                return hideDialog(WIN_DIALOG_ELEM)
            }
            newGame(WIN_DIALOG_ELEM.querySelector('.level').value)
            hideDialog(WIN_DIALOG_ELEM)
        })

        EDGES_ELEM.addEventListener('click', (e) => {
            if (!GAME) { return }
            if (e.target.classList.contains('edge')) {
                selectEdge(GAME, e.target)
            }
        })

        GRAPH_ELEM.addEventListener('click', (e) => {
            if (!GAME) { return }
            if (e.target.nodeName.toLowerCase() === 'circle') {
                selectNode(GAME, e.target)
            } else if (e.target.classList.contains('node-label')) {
                const target = document.getElementById(e.target.id.split('-label')[0])
                selectNode(GAME, target)
            } else if (e.target.nodeName.toLowerCase() === 'line') {
                removeEdge(GAME, e.target)
            } else if (e.target.classList.contains('edge-label')) {
                const target = document.getElementById(e.target.id.split('-label')[0])
                removeEdge(GAME, target)
            }
        })

        document.getElementById('reset').addEventListener('click', () => {
            if (!GAME) { return }
            Array.from(GRAPH_ELEM.querySelectorAll('line')).forEach(el => {
                removeEdge(GAME, el)
            })
        })

        document.getElementById('layout').addEventListener('click', () => {
            if (!GAME) { return }
            changeLayout(GAME)
        })
    }

    function newGame(level=0) {
        level = Number(level) || 0
        GRAPH_ELEM.innerHTML = ''
        EDGES_ELEM.innerHTML = ''
        showMessage('')
        GRAPH_ELEM.setAttribute('data-level', level)

        GAME = { ...LEVELS[level], level, nodes: [], edges: [] }
        GAME.nodes = determineNodes(GAME)
        GAME.edges = determineEdges(GAME)
        drawGraphNodes(GAME)
        drawAvailableEdges(GAME)

        saveGame(GAME)
    }

    function loadGame(serialized) {
        const [level, nodes, edges] = serialized.split(';')
        GAME = { ...LEVELS[level], level, nodes: [], edges: [] }

        GRAPH_ELEM.setAttribute('data-level', level)

        nodes.split('|').forEach((n, i) => {
            const [weight, count, x, y] = n.split(/[x@,]/).map(it => Number(it))
            GAME.nodes.push({ id: `N${i+1}`, weight, count, x, y, edges: [] })
        })
        drawGraphNodes(GAME, true)

        edges.split('|').forEach((e, i) => {
            const [source, dest, weight, n1, n2] = e.split(/[x>-]/).map(it => Number(it))
            const edge = { id: i+1, weight, source: `N${source}`, dest: `N${dest}`, loc: null }
            if (n1 && n2) {
                edge.loc = [`N${n1}`, `N${n2}`]
            }
            GAME.edges.push(edge)
        })
        drawAvailableEdges(GAME)
        GAME.edges.forEach(e => {
            if (e.loc) {
                addEdge(GAME, e.loc[0], e.loc[1], e.weight, e)
                const edgeElem = document.getElementById(`E${e.id}`)
                edgeElem.classList.add('used')
            }
        })
    }


    /************* COMMON HELPERS *************/

    function showMessage(msg, timeout=MSG_TIMEOUT) {
        if (MSG_ELEM.innerText === msg) {
            return
        } else if (MSG_ELEM.innerText) {
            clearTimeout(MSG_TIMER)
            MSG_TIMER = null
        }

        MSG_ELEM.innerText = ('' + msg) || ''
        if (msg) {
            MSG_ELEM.style.top = '0'
            MSG_ELEM.style.opacity = 1
        }
        if (Number(timeout)) {
            MSG_TIMER = setTimeout(() => {
                fadeOut(MSG_ELEM, MSG_FADEOUT).then(() => {
                    MSG_ELEM.style.top = '-1000px'
                    MSG_ELEM.innerText = ''
                })
            }, timeout)
        }
    }

    function fadeOut(el, time) {
        const steps = 100
        return new Promise((resolve, _) => {
            let step = 0
            let opacity = el.style.opacity || 1
            const interval = opacity / steps
            const timer = setInterval(() => {
                step++
                opacity = Math.max(0, opacity - interval)
                el.style.opacity = opacity
                if (step >= steps || opacity === 0) {
                    clearInterval(timer)
                    resolve()
                }
            }, Math.ceil((time * 1000) / steps))
        })
    }

    function saveGame(g) {
        const serial = [
            g.level,
            g.nodes.map(n => `${n.weight}x${n.count}@${Math.floor(n.x)},${Math.floor(n.y)}`).join('|'),
            g.edges.map(e => {
                let info = `${e.source.substring(1)}-${e.dest.substring(1)}x${e.weight}`
                if (e.loc) {
                    info += `>${e.loc[0].substring(1)}-${e.loc[1].substring(1)}`
                }
                return info
            }).join('|'),
        ]
        localStorage.setItem(LOCALSTORAGE_KEY, serial.join(';'))
    }

    function showDialog(idOrElem) {
        let elem = idOrElem
        if (typeof(idOrElem) === 'string') {
            elem = document.getElementById(idOrElem)
        }
        MAIN_ELEM.classList.add('dialog-open')
        SHIELD_ELEM.style.display = 'block'
        elem.setAttribute('open', 'open')
    }

    function hideDialog(idOrElem) {
        let elem = idOrElem
        if (typeof(idOrElem) === 'string') {
            elem = document.getElementById(idOrElem)
        }
        elem.removeAttribute('open')
        MAIN_ELEM.classList.remove('dialog-open')
        SHIELD_ELEM.style.display = 'none'
    }

    function getRandomBetween(min, max) {
        return Math.floor(Math.random() * (max - min)) + min
    }


    /************* ALL THE FUNCTIONALITY *************/

    function changeLayout(g) {
        Array.from(GRAPH_ELEM.querySelectorAll('circle, text'))
            .forEach(el => GRAPH_ELEM.removeChild(el))
        const edges = Array.from(GRAPH_ELEM.querySelectorAll('line'))
            .map(el => {
                GRAPH_ELEM.removeChild(el)
                return el.id.split('-').concat([Number(el.getAttribute('data-weight'))])
            })
        g.nodes.forEach(n => n.edges = [])
        drawGraphNodes(g)
        edges.forEach(e => {
            const edge = g.edges.filter(ge => ge.loc && ge.loc[0] === e[0] && ge.loc[1] === e[1] && ge.weight === e[2])[0]
            if (edge) { edge.loc = null }
            addEdge(g, e[0], e[1], e[2], edge)
        })
        saveGame(g)
    }

    function selectEdge(g, elem) {
        if (elem.classList.contains('selected')) {
            elem.classList.remove('selected')
            const node = document.querySelector('circle.selected')
            if (node) {
                node.classList.remove('selected')
            }
        } else if (!elem.classList.contains('used')) {
            const edge = EDGES_ELEM.querySelector('.selected')
            if (edge) {
                edge.classList.remove('selected')
            }
            elem.classList.add('selected')
        }
    }

    function selectNode(g, elem) {
        const edge = EDGES_ELEM.querySelector('.selected')
        if (!edge) {
            showMessage('Select an available connection first!')
            return
        }

        if (elem.classList.contains('selected')) {
            elem.classList.remove('selected')
        } else {
            const otherElem = document.querySelector('circle.selected')
            if (otherElem) {
                let prevEdge = document.getElementById(elem.id + '-' + otherElem.id)
                if (!prevEdge) {
                    prevEdge = document.getElementById(otherElem.id + '-' + elem.id)
                }
                if (prevEdge) {
                    showMessage('You already have a connection between those stars!')
                    return
                }

                edge.classList.remove('selected')
                edge.classList.add('used')
                addEdge(g, otherElem.id, elem.id, Number(edge.innerText))
            } else {
                elem.classList.add('selected')
            }
        }
    }

    function removeEdge(g, elem) {
        GRAPH_ELEM.removeChild(elem)
        GRAPH_ELEM.removeChild(document.getElementById(elem.id + '-label'))
        
        const weight = Number(elem.getAttribute('data-weight'))
        const [sourceId, destId] = elem.id.split('-')

        const edge = g.edges.filter(e => e.loc && e.loc[0] === sourceId && e.loc[1] === destId && e.weight === weight)[0]
        if (edge) { edge.loc = null }

        g.nodes
            .filter(n => n.id === sourceId || n.id === destId)
            .forEach(n => {
                n.edges.splice(n.edges.indexOf(weight), 1)
            })
        const libraryEdge = EDGES_ELEM.querySelector(`[data-weight="${weight}"].edge.used`)
        if (libraryEdge) {
            libraryEdge.classList.remove('used')
        }
        checkGraph(g)
        saveGame(g)
    }

    function addEdge(g, sourceId, destId, weight, edgeData=null) {
        let edge = edgeData
        if (!edge) {
            edge = g.edges.filter(e => e.weight === weight && !e.loc)[0]
        }
        if (!edge) {
            showMessage('You don\'t have a connection with that mass!')
            return
        }
        const sourceNode = g.nodes.filter(n => n.id === sourceId)[0]
        const destNode = g.nodes.filter(n => n.id === destId)[0]
        if (!sourceNode || !destNode) {
            showMessage('Sorry, but you can\'t connect those stars!')
            return
        }
        sourceNode.edges.push(weight)
        destNode.edges.push(weight)
        drawEdge(g, sourceNode, destNode, weight)
        edge.loc = [sourceId, destId]
        checkGraph(g)
        if (!edgeData) {
            saveGame(g)
        }
    }

    function checkGraph(g) {
        let complete = true
        g.nodes.forEach(n => {
            let countComplete = false
            let weightComplete = false
            if (n.edges.length === n.count) {
                countComplete = true
            }
            const weight = n.edges.reduce((prev, curr) => { return prev += curr }, 0)
            if (weight === n.weight) {
                weightComplete = true
            }
            const elem = document.getElementById(n.id)
            elem.classList.remove('in-progress', 'complete', 'over')
            if (!countComplete || !weightComplete) {
                complete = false
            }
            if (countComplete && weightComplete) {
                elem.classList.add('complete')
            } else if (weight > n.weight || n.edges.length > n.count) {
                elem.classList.add('over')
            } else if (n.edges.length) {
                elem.classList.add('in-progress')
            }
        })

        if (complete) {
            GAME = null
            WIN_DIALOG_ELEM.querySelector('.level').value = GRAPH_ELEM.getAttribute('data-level')
            SNAPSHOT_ELEM.setAttribute('viewBox', `0 0 ${GRAPH_ELEM.clientWidth} ${GRAPH_ELEM.clientHeight}`)
            SNAPSHOT_ELEM.innerHTML = GRAPH_ELEM.innerHTML
            
            showDialog(WIN_DIALOG_ELEM)
        }
    }

    function drawEdge(g, sourceNode, destNode, weight) {
        GRAPH_ELEM.removeChild(document.getElementById(sourceNode.id))
        GRAPH_ELEM.removeChild(document.getElementById(sourceNode.id + '-label'))
        GRAPH_ELEM.removeChild(document.getElementById(destNode.id))
        GRAPH_ELEM.removeChild(document.getElementById(destNode.id + '-label'))
        GRAPH_ELEM.innerHTML += `<line id='${sourceNode.id}-${destNode.id}' data-weight='${weight}' x1='${sourceNode.x}' y1='${sourceNode.y}' x2='${destNode.x}' y2='${destNode.y}' stroke-width='${weight*2}' />`
        const labelX = Math.max(destNode.x, sourceNode.x) - (Math.abs(destNode.x - sourceNode.x) / 2)
        const labelY = Math.max(destNode.y, sourceNode.y) - (Math.abs(destNode.y - sourceNode.y) / 2)
        GRAPH_ELEM.innerHTML += `<text id='${sourceNode.id}-${destNode.id}-label' class='edge-label' x='${labelX}' y='${labelY}'>${weight}</text>`
        drawGraphNode(g, sourceNode)
        drawGraphNode(g, destNode)
    }

    function determineNodes(g) {
        const nodes = []
        for (let i=0; i<g.nodeCount; ++i) {
            nodes.push({ id: 'N'+(i+1), weight: 0, count: 0, edges: [] })
        }
        return nodes
    }

    function determineEdges(g) {
        const count = Array.isArray(g.edgeCount) ? getRandomBetween(g.edgeCount[0], g.edgeCount[1]) : Number(g.edgeCount)
        const edges = []
        const cache = []

        // start by ensuring every node is the source for at least 1 edge
        g.nodes.forEach((n, i) => {
            const weight = getRandomBetween(g.weightRange[0], g.weightRange[1])
            let [source, dest] = pickTwoNodes(g.nodes, n)
            while (cache.includes(source.id+'-'+dest.id)) {
                ;[source, dest] = pickTwoNodes(g.nodes, n)
            }
            cache.push(source.id+'-'+dest.id, dest.id+'-'+source.id)
            source.weight += weight
            source.count++
            dest.weight += weight
            dest.count++
            edges.push({ id: i, weight, source: source.id, dest: dest.id, loc: null })
        })

        // now add edges up to our max
        for (let i=g.nodes.length; i<count; ++i) {
            const weight = getRandomBetween(g.weightRange[0], g.weightRange[1])
            let [source, dest] = pickTwoNodes(g.nodes)
            
            while (cache.includes(source.id+'-'+dest.id)) {
                ;[source, dest] = pickTwoNodes(g.nodes)
            }
            cache.push(source.id+'-'+dest.id, dest.id+'-'+source.id)
            source.weight += weight
            source.count++
            dest.weight += weight
            dest.count++
            edges.push({ id: edges.length, weight, source: source.id, dest: dest.id, loc: null })
        }
        return edges
    }

    function pickTwoNodes(nodes, given=null) {
        let one = Math.floor(Math.random() * nodes.length)
        let two = given || one
        if (given) {
            one = given
            while (two === one) {
                two = nodes[Math.floor(Math.random() * nodes.length)]
            }
        } else {
            while (two === one) {
                two = Math.floor(Math.random() * nodes.length)
            }
        }
        return (given) ? [given, two] : [nodes[one], nodes[two]]
    }

    function drawGraphNodes(g, useExistingPositions=false) {
        const positions = []
        g.nodes.forEach((n) => {
            let pos = [n.x, n.y]
            if (!useExistingPositions || !n.x || !n.y) {
                pos = getNodePosition(g, n, positions)
                n.x = pos[0]
                n.y = pos[1]
            }
            positions.push([...pos, n.weight])
            drawGraphNode(g, n)
        })
    }

    function drawGraphNode(g, node) {
        const radius = getNodeRadius(g, node)
        GRAPH_ELEM.innerHTML += `<circle id='${node.id}' data-edges='[]' weight='${node.weight}' count='${node.count}' cx='${node.x}' cy='${node.y}' r='${radius}' stroke-width='0' />`
        const labelX = (node.x < (GRAPH_ELEM.clientWidth - 70)) ? node.x + radius + 2 : node.x - radius - 45
        GRAPH_ELEM.innerHTML += `<text id='${node.id}-label' class='node-label' x='${labelX}' y='${node.y + 5}'>${node.weight} x ${node.count}</text>`
    }

    function getNodeRadius(g, node) {
        return Math.max(MIN_NODE_SIZE, NODE_MULTIPLIER * Math.log(node.weight * node.weight))
    }

    function getNodePosition(g, node, positions) {
        const radius = getNodeRadius(g, node)
        let x = getRandomBetween(radius, GRAPH_ELEM.clientWidth - radius)
        let y = getRandomBetween(radius, GRAPH_ELEM.clientHeight - radius)
        for (let i=0; i<positions.length; ++i) {
            if (Math.abs(positions[i][0] - x) < (node.weight + positions[i][2] + NODE_PADDING) &&
                Math.abs(positions[i][1] - y) < (node.weight + positions[i][2] + NODE_PADDING)) {
                return getNodePosition(g, node, positions)
            }
        }
        return [x, y]
    }

    function drawAvailableEdges(g) {
        const edgeElems = []
        g.edges.forEach(e => {
            edgeElems.push(`<span id='E${e.id}' data-weight='${e.weight}' class='edge'>${e.weight}</span>`)
        })
        EDGES_ELEM.innerHTML = edgeElems.join('\n')

        Array.from(EDGES_ELEM.querySelectorAll('.edge')).forEach(edgeElem => {
            edgeElem.style.setProperty('--weight', `${Number(edgeElem.getAttribute('data-weight')) * 2}px`)
        })
    }


    /************* START THE SHOW *************/
                       main()
    /******************************************/

})();
