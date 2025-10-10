
;(() => {

    // TODO:
    // solver (for quitters)
    // win screen (timer?)
    // start new game
    // game options (difficulty, etc)
    // game timer
    // save player stats
    // better node & label design
    // better UI overall
    // dark mode

    const GRAPH_ELEM = document.getElementById('graph')
    const EDGES_ELEM = document.getElementById('edges')
    const MSG_ELEM = document.getElementById('message')
    const MSG_TIMEOUT = 5000
    
    let GAME = null

    function main() {

        newGame()

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

    function newGame() {
        GAME = {
            nodeCount: 6,
            edgeCount: [5, 12],
            weightRange: [2, 7],
            minNodeSize: 6,
            nodePadding: 40
        }

        GRAPH_ELEM.innerHTML = ''
        EDGES_ELEM.innerHTML = ''
        showMessage('')

        GAME.nodes = determineNodes(GAME)
        GAME.edges = determineEdges(GAME)
        drawGraphNodes(GAME)
        drawAvailableEdges(GAME)
    }

    function showMessage(msg, timeout=MSG_TIMEOUT) {
        MSG_ELEM.innerText = ''+msg || ''
        if (Number(timeout)) {
            setTimeout(() => {
                MSG_ELEM.innerText = ''
            }, timeout)
        }
    }

    function changeLayout(g) {
        Array.from(GRAPH_ELEM.querySelectorAll('circle, text'))
            // .concat(Array.from(GRAPH_ELEM.querySelectorAll('text')))
            .forEach(el => GRAPH_ELEM.removeChild(el))
        const edges = Array.from(GRAPH_ELEM.querySelectorAll('line'))
            .map(el => {
                GRAPH_ELEM.removeChild(el)
                return el.id.split('-').concat([Number(el.getAttribute('data-weight'))])
            })
        g.nodes.forEach(n => n.edges = [])
        drawGraphNodes(g)
        edges.forEach(e => {
            addEdge(g, e[0], e[1], e[2])
        })
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
            showMessage('Please select an edge to place first!')
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
                    showMessage('You already have an edge between those two nodes!')
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
    }

    function addEdge(g, sourceId, destId, weight) {
        const edge = g.edges.filter(e => e.weight === weight && !e.used)[0]
        if (!edge) {
            showMessage('Sorry, but you don\'t have a free edge with that weight!')
            return
        }
        const sourceNode = g.nodes.filter(n => n.id === sourceId)[0]
        const destNode = g.nodes.filter(n => n.id === destId)[0]
        if (!sourceNode || !destNode) {
            showMessage('Sorry, but those are invalid nodes!')
            return
        }
        sourceNode.edges.push(weight)
        destNode.edges.push(weight)
        drawEdge(g, sourceNode, destNode, weight)
        checkGraph(g)
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
            showMessage('You win!', 0)
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
            // console.log(source, dest)
            cache.push(source.id+'-'+dest.id, dest.id+'-'+source.id)
            source.weight += weight
            source.count++
            dest.weight += weight
            dest.count++
            edges.push({ id: i, weight, source, dest, used: false })
        })

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
            edges.push({ id: edges.length, weight, source, dest })
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

    function drawGraphNodes(g) {
        const positions = []
        g.nodes.forEach((n) => {
            const pos = getNodePosition(g, n, positions)
            positions.push([...pos, n.weight])
            n.x = pos[0]
            n.y = pos[1]
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
        return Math.max(g.minNodeSize, 4 * Math.log(node.weight * node.weight))
    }

    function getNodePosition(g, node, positions) {
        const radius = getNodeRadius(g, node)
        let x = getRandomBetween(radius, GRAPH_ELEM.clientWidth - radius)
        let y = getRandomBetween(radius, GRAPH_ELEM.clientHeight - radius)
        for (let i=0; i<positions.length; ++i) {
            if (Math.abs(positions[i][0] - x) < (node.weight + positions[i][2] + g.nodePadding) &&
                Math.abs(positions[i][1] - y) < (node.weight + positions[i][2] + g.nodePadding)) {
                return getNodePosition(g, node, positions)
            }
        }
        return [x, y]
    }

    function drawAvailableEdges(g) {
        const edgeElems = []
        g.edges.forEach(e => {
            edgeElems.push(`<span id='E${e.id}' data-weight='${e.weight}' class='edge' style='height: ${e.weight * 2}px;'>${e.weight}</span>`)
        })
        EDGES_ELEM.innerHTML = edgeElems.join('\n')
    }

    function getRandomBetween(min, max) {
        return Math.floor(Math.random() * (max - min)) + min
    }

    main()

})();
