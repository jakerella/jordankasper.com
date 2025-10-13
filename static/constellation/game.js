
;(() => {

    // TODO:
    // BUG: sometimes it says you already have a connection between two nodes on new game without refresh (maybe with hints?)
    // bonus points for an alternate constellation from the known solution
    // save player stats
    // help and about info (modal and footer)
    // dark mode
    // game timer (?) - and if so, does it affect points?
    // share result online
    // better node & label design
    // better UI overall
    // never allow multiple graphs in same puzzle (like 2 single-count nodes connected)

    const MAIN_ELEM = document.querySelector('main')
    const SHIELD_ELEM = document.getElementById('shield')
    const GRAPH_ELEM = document.getElementById('graph')
    const EDGES_ELEM = document.getElementById('edges')
    const MSG_ELEM = document.getElementById('message')
    const NEW_GAME_ELEM = document.getElementById('new-game-modal')
    const WIN_DIALOG_ELEM = document.getElementById('win-modal')
    const HINT_DIALOG_ELEM = document.getElementById('hint-modal')
    const LOCALSTORAGE_KEY = 'constellation'
    const MSG_TIMEOUT = 4000
    const MSG_FADEOUT = 2
    const MIN_NODE_SIZE = 7
    const NODE_MULTIPLIER = 4
    const NODE_PADDING = 40
    const MAX_HINTS = 3
    const HINT_POINT_REDUCTION = 4
    const CENTRAL_NODE_POINT_MODIFIER = 2
    const OUTLIER_NODE_POINT_MODIFIER = 3
    
    const LEVELS = [
        { name: 'Main Sequence', nodeCount: 5, edgeCount: [6, 6], weightRange: [2, 6] },
        { name: 'Bright Giant', nodeCount: 6, edgeCount: [7, 13], weightRange: [2, 7] },
        { name: 'Super Giant', nodeCount: 7, edgeCount: [8, 14], weightRange: [2, 8] },
        { name: 'Hyper Giant', nodeCount: 8, edgeCount: [9, 15], weightRange: [2, 9] }
    ]


    let GAME = null
    let messageTimer = null
    let fullscreen = false


    /****************************************************/
    function main() {
        /****** GAME UI SETUP ******/
        const levelOptions = LEVELS.map((lv, i) => `<option value='${i}'>${lv.name}</option>`).join('\n')
        Array.from(document.querySelectorAll('select.level')).forEach((opt) => {
            opt.innerHTML = levelOptions
        })
        document.querySelector('.max-hints').innerText = MAX_HINTS
        document.querySelector('.hint-point-deduction').innerText = HINT_POINT_REDUCTION

        setupEventHandlers()

        /****** LOAD OR START NEW GAME ******/
        const currGame = localStorage.getItem(LOCALSTORAGE_KEY)
        if (currGame) {
            let serialized = null
            try {
                serialized = atob(currGame)
            } catch(_) {
                showMessage('Sorry, but we lost your saved game, please start over!', 'warning')
                GAME = newGame(0)
                return 
            }
            GAME = loadGame(serialized)
        } else {
            GAME = newGame(0)
        }
        if (/^localhost/.test(window.location.host)) {
            console.debug(GAME)
        }
    }
    /****************************************************/


    function setupEventHandlers() {
        document.getElementById('fullscreen').addEventListener('click', () => {
            if (fullscreen) {
                document.exitFullscreen().then(() => fullscreen = false)
            } else {
                document.body.requestFullscreen().then(() => fullscreen = true)
            }
        })

        document.getElementById('new').addEventListener('click', () => {
            if (GAME) {
                return showDialog(NEW_GAME_ELEM)
            }
            GAME = newGame(0)  // if there is no existing game, we'll use the lowest level
        })

        NEW_GAME_ELEM.querySelector('.cancel').addEventListener('click', () => {
            hideDialog(NEW_GAME_ELEM)
        })
        NEW_GAME_ELEM.querySelector('.new-game').addEventListener('click', () => {
            GAME = newGame(NEW_GAME_ELEM.querySelector('.level').value)
            hideDialog(NEW_GAME_ELEM)
        })

        WIN_DIALOG_ELEM.querySelector('.new-game').addEventListener('click', () => {
            GAME = null
            GAME = newGame(WIN_DIALOG_ELEM.querySelector('.level').value)
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

        document.getElementById('hint').addEventListener('click', () => {
            if (!GAME) { return }
            if (GAME.hints >= MAX_HINTS) {
                return showMessage('Sorry, but you\'re out of hints.', 'warning')
            }
            showDialog(HINT_DIALOG_ELEM)
        })
        HINT_DIALOG_ELEM.querySelector('.cancel').addEventListener('click', () => {
            hideDialog(HINT_DIALOG_ELEM)
        })
        HINT_DIALOG_ELEM.querySelector('.show-hint').addEventListener('click', () => {
            if (!GAME) {
                return hideDialog(HINT_DIALOG_ELEM)
            }
            if (GAME.hints >= MAX_HINTS) {
                showMessage('Sorry, but you\'re out of hints.', 'warning')
                return hideDialog(HINT_DIALOG_ELEM)
            }
            revealRandomConnection(GAME)
            hideDialog(HINT_DIALOG_ELEM)
        })
    }

    function newGame(level=0) {
        level = Number(level) || 0
        GRAPH_ELEM.innerHTML = ''
        EDGES_ELEM.innerHTML = ''
        showMessage('')
        GRAPH_ELEM.setAttribute('data-level', level)

        const gameData = { ...LEVELS[level], level, hints: 0, nodes: [], edges: [] }
        gameData.nodes = determineNodes(gameData)
        gameData.edges = determineEdges(gameData)
        drawGraphNodes(gameData)
        drawAvailableEdges(gameData)

        saveGame(gameData)
        if (/^localhost/.test(window.location.host)) {
            console.debug(gameData)
        }
        return gameData
    }

    function loadGame(serialized) {
        const [level, nodes, edges, hints] = serialized.split(';')

        if (!level || !nodes || !edges) {
            showMessage('Sorry, but we lost your saved game, please start over!', 'warning')
            return newGame(0)
        }

        const gameData = { ...LEVELS[Number(level)], level: Number(level), hints: Number(hints) || 0, nodes: [], edges: [] }

        GRAPH_ELEM.setAttribute('data-level', level)

        nodes.split('|').forEach((n, i) => {
            const [weight, count, x, y] = n.split(/[x@,]/).map(it => Number(it))
            gameData.nodes.push({ id: `N${i+1}`, weight, count, x, y, edges: [] })
        })
        drawGraphNodes(gameData, true)

        edges.split('|').forEach((e, i) => {
            const [source, dest, weight, n1, n2] = e.split(/[-x~>]/).map(it => Number(it))
            const edge = { id: i+1, weight, source: `N${source}`, dest: `N${dest}`, loc: null }
            if (n1 && n2) {
                edge.loc = [`N${n1}`, `N${n2}`]
                if (/~/.test(e)) {
                    edge.revealed = true
                }
            }
            gameData.edges.push(edge)
        })
        drawAvailableEdges(gameData)
        gameData.edges.forEach(e => {
            if (e.loc) {
                addEdgeAndMarkUnavailable(gameData, e.loc[0], e.loc[1], e, true)
                if (e.revealed) {
                    const edgeElem = GRAPH_ELEM.getElementById(`${e.loc[0]}-${e.loc[1]}`)
                    edgeElem.classList.add('revealed')
                }
            }
        })

        return gameData
    }


    /************* COMMON HELPERS *************/

    function showMessage(msg, cls='info', timeout=MSG_TIMEOUT) {
        if (MSG_ELEM.innerText === msg) {
            return
        } else if (MSG_ELEM.innerText) {
            clearTimeout(messageTimer)
            messageTimer = null
        }

        MSG_ELEM.innerText = ('' + msg) || ''
        if (msg) {
            MSG_ELEM.style.top = '0'
            MSG_ELEM.style.opacity = 1
            MSG_ELEM.classList.remove('info', 'warning', 'error')
            MSG_ELEM.classList.add(cls)
        }
        if (Number(timeout)) {
            messageTimer = setTimeout(() => {
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
                    const connector = (e.revealed) ? '~' : '-'
                    info += `>${e.loc[0].substring(1)}${connector}${e.loc[1].substring(1)}`
                }
                return info
            }).join('|'),
            g.hints
        ]
        localStorage.setItem(LOCALSTORAGE_KEY, btoa(serial.join(';')))
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
            endGame(g)
        }
    }

    function endGame(g) {
        const scoreData = {
            base: (g.nodes.length * g.edges.length),
            hints: g.hints * HINT_POINT_REDUCTION,
            central: 0,
            outlier: 0,
            alternate: 0
        }

        g.nodes.forEach((n) => {
            if (n.count === (g.nodes.length - 1)) {
                scoreData.central += ((g.level + 1) * CENTRAL_NODE_POINT_MODIFIER)
            }
            if (n.count === 1) {
                scoreData.outlier += ((g.level + 1) * OUTLIER_NODE_POINT_MODIFIER)
            }
        })

        const finalScore = scoreData.base - scoreData.hints - scoreData.central - scoreData.outlier
        WIN_DIALOG_ELEM.querySelector('.final-score').innerText = finalScore
        WIN_DIALOG_ELEM.querySelector('.score-base').innerText = scoreData.base
        WIN_DIALOG_ELEM.querySelector('.score-hints').innerText = '-'+scoreData.hints
        WIN_DIALOG_ELEM.querySelector('.score-central').innerText = '-'+scoreData.central
        WIN_DIALOG_ELEM.querySelector('.score-outlier').innerText = '-'+scoreData.outlier

        WIN_DIALOG_ELEM.querySelector('.level').value = GRAPH_ELEM.getAttribute('data-level')
        const snapshot = WIN_DIALOG_ELEM.querySelector('.snapshot')
        snapshot.setAttribute('viewBox', `0 0 ${GRAPH_ELEM.clientWidth} ${GRAPH_ELEM.clientHeight}`)
        snapshot.innerHTML = GRAPH_ELEM.innerHTML
        
        GAME = null
        g = null
        showDialog(WIN_DIALOG_ELEM)
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
        const edgeInfo = Array.from(GRAPH_ELEM.querySelectorAll('line'))
            .map(el => {
                GRAPH_ELEM.removeChild(el)
                return el.id.split('-').concat([Number(el.getAttribute('data-weight'))])
            })
        g.nodes.forEach(n => n.edges = [])
        drawGraphNodes(g)
        edgeInfo.forEach(e => {
            const edge = g.edges.filter(ge => ge.loc && ge.loc[0] === e[0] && ge.loc[1] === e[1] && ge.weight === e[2])[0]
            edge.loc = null
            addEdge(g, e[0], e[1], e[2], edge)
            if (edge.revealed) {
                const edgeElem = GRAPH_ELEM.getElementById(`${edge.source}-${edge.dest}`)
                edgeElem.classList.add('revealed')
            }
        })
        saveGame(g)
    }

    function revealRandomConnection(g) {
        const unrevealedEdges = g.edges.filter(e => !e.revealed)
        const edge = unrevealedEdges[Math.floor(Math.random() * unrevealedEdges.length)]

        if (!edge) {
            return showMessage('No connection available to reveal.', 'warning')
        }

        let msg = 'A new connection has been revealed!'
        if (edge.loc) {
            if ((edge.loc[0] === edge.source || edge.loc[1] === edge.source) &&
                (edge.loc[0] === edge.dest || edge.loc[1] === edge.dest)) {
                msg = 'A connection has been confirmed!'
            } else {
                msg = 'A connection was moved!'
            }
        }

        let existingEdge = GRAPH_ELEM.getElementById(`${edge.source}-${edge.dest}`)
        if (!existingEdge) {
            existingEdge = GRAPH_ELEM.getElementById(`${edge.dest}-${edge.source}`)
        }
        if (existingEdge) {
            removeEdge(g, existingEdge)
            if (Number(existingEdge.getAttribute('data-weight')) !== edge.weight) {
                msg = 'An existing connection was removed'
                if (edge.loc) {
                    msg += ', and the correct connection was moved!'
                } else {
                    msg += ', and a new connection revealed!'
                }
            }
        }

        g.hints = (g.hints || 0) + 1
        edge.revealed = true
        if (edge.loc) {
            removeEdge(g, GRAPH_ELEM.getElementById(`${edge.loc[0]}-${edge.loc[1]}`))
        }
        addEdgeAndMarkUnavailable(g, edge.source, edge.dest, edge)
        const edgeElem = GRAPH_ELEM.getElementById(`${edge.source}-${edge.dest}`)
        edgeElem.classList.add('revealed')

        showMessage(msg)
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
            showMessage('Select an available connection first!', 'warning')
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
                    showMessage('You already have a connection between those stars!', 'warning')
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
        const availableEdge = EDGES_ELEM.querySelector(`[data-weight="${weight}"].edge.used`)
        if (availableEdge) {
            availableEdge.classList.remove('used')
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
            return showMessage('You don\'t have a connection with that mass!', 'warning')
        }
        const sourceNode = g.nodes.filter(n => n.id === sourceId)[0]
        const destNode = g.nodes.filter(n => n.id === destId)[0]
        if (!sourceNode || !destNode) {
            return showMessage('Sorry, but you can\'t connect those stars!', 'warning')
        }
        sourceNode.edges.push(weight)
        destNode.edges.push(weight)
        drawEdge(g, sourceNode, destNode, weight)
        edge.loc = [sourceId, destId]
        checkGraph(g)
        if (!edgeData) {
            saveGame(g)
        }
        return true
    }

    function addEdgeAndMarkUnavailable(g, sourceId, destId, edge, skipSave=false) {
        if (addEdge(g, sourceId, destId, edge.weight, edge)) {
            const availEdgeElem = document.getElementById(`E${edge.id}`)
            if (availEdgeElem) {
                availEdgeElem.classList.add('used')
            }
            if (!skipSave) {
                saveGame(g)
            }
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
