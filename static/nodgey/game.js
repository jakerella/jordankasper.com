
;(() => {

    // TODO:
    // remove all edges
    // win screen (timer?)
    // new game
    // solver (for quitters)
    // node & label design

    function main() {
        const GAME = {
            graphElem: document.getElementById('graph'),
            edgesElem: document.getElementById('edges'),
            messageElem: document.getElementById('message'),
            nodeCount: [5, 8],
            edgeCount: [5, 12],
            weightRange: [1, 10],
            minNodeSize: 7,
            nodePadding: 30
        }

        GAME.nodes = determineNodes(GAME)
        GAME.edges = determineEdges(GAME)
        // console.log(GAME.edges.map(e => `${e.source.id} to ${e.dest.id} (${e.weight})`))
        drawGraphNodes(GAME)
        drawAvailableEdges(GAME)

        GAME.edgesElem.addEventListener('click', (e) => {
            GAME.messageElem.innerText = ''
            if (e.target.classList.contains('edge')) {
                selectEdge(GAME, e.target)
            }
        })

        GAME.graphElem.addEventListener('click', (e) => {
            GAME.messageElem.innerText = ''
            if (e.target.nodeName.toLowerCase() === 'circle') {
                selectNode(GAME, e.target)
            } else if (e.target.nodeName.toLowerCase() === 'line') {
                removeEdge(GAME, e.target)
            }
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
            const edge = g.edgesElem.querySelector('.selected')
            if (edge) {
                edge.classList.remove('selected')
            }
            elem.classList.add('selected')
        }
    }

    function selectNode(g, elem) {
        const edge = g.edgesElem.querySelector('.selected')
        if (!edge) {
            g.messageElem.innerText = 'Please select an edge to place first!'
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
                    g.messageElem.innerText = 'You already have an edge between those two nodes!'
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
        g.graphElem.removeChild(elem)
        g.graphElem.removeChild(document.getElementById(elem.id + '-label'))
        const weight = Number(elem.getAttribute('data-weight'))
        const [sourceId, destId] = elem.id.split('-')
        g.nodes
            .filter(n => n.id === sourceId || n.id === destId)
            .forEach(n => {
                n.edges.splice(n.edges.indexOf(weight), 1)
            })
        const libraryEdge = g.edgesElem.querySelector(`[data-weight="${weight}"].edge.used`)
        if (libraryEdge) {
            libraryEdge.classList.remove('used')
        }
        checkGraph(g)
    }

    function addEdge(g, sourceId, destId, weight) {
        const edge = g.edges.filter(e => e.weight === weight && !e.used)[0]
        if (!edge) {
            g.messageElem.innerText = 'Sorry, but you don\'t have a free edge with that weight!'
            return
        }
        const sourceNode = g.nodes.filter(n => n.id === sourceId)[0]
        const destNode = g.nodes.filter(n => n.id === destId)[0]
        if (!sourceNode || !destNode) {
            g.messageElem.innerText = 'Sorry, but those are invalid nodes!'
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
            g.messageElem.innerText = 'You win!'
        }
    }

    function drawEdge(g, sourceNode, destNode, weight) {
        g.graphElem.removeChild(document.getElementById(sourceNode.id))
        g.graphElem.removeChild(document.getElementById(sourceNode.id + '-label'))
        g.graphElem.removeChild(document.getElementById(destNode.id))
        g.graphElem.removeChild(document.getElementById(destNode.id + '-label'))
        g.graphElem.innerHTML += `<line id='${sourceNode.id}-${destNode.id}' data-weight='${weight}' x1='${sourceNode.x}' y1='${sourceNode.y}' x2='${destNode.x}' y2='${destNode.y}' stroke-width='${weight}' />`
        const labelX = Math.max(destNode.x, sourceNode.x) - (Math.abs(destNode.x - sourceNode.x) / 2)
        const labelY = Math.max(destNode.y, sourceNode.y) - (Math.abs(destNode.y - sourceNode.y) / 2)
        g.graphElem.innerHTML += `<text id='${sourceNode.id}-${destNode.id}-label' class='edge-label' x='${labelX}' y='${labelY}'>${weight}</text>`
        drawGraphNode(g, sourceNode)
        drawGraphNode(g, destNode)
    }

    function determineNodes(g) {
        const count = Math.ceil(Math.random() * (g.nodeCount[1] - g.nodeCount[0] + 1)) + g.nodeCount[0]
        const nodes = []
        for (let i=0; i<count; ++i) {
            nodes.push({ id: 'N'+(i+1), weight: 0, count: 0, edges: [] })
        }
        return nodes
    }

    function determineEdges(g) {
        let count = Math.ceil(Math.random() * (g.edgeCount[1] - g.edgeCount[0] + 1)) + g.edgeCount[0]
        count = Math.min(count, ((g.nodes.length * (g.nodes.length - 1)) / 2))
        const edges = []
        const cache = []

        // start by ensuring every node is the source for at least 1 edge
        g.nodes.forEach((n, i) => {
            const weight = Math.ceil(Math.random() * (g.weightRange[1] - g.weightRange[0] + 1)) + g.weightRange[0]
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
            const weight = Math.ceil(Math.random() * (g.weightRange[1] - g.weightRange[0] + 1)) + g.weightRange[0]
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

    function drawGraphNode(g, n) {
        const radius = Math.max(n.weight, g.minNodeSize)
        g.graphElem.innerHTML += `<circle id='${n.id}' data-edges='[]' weight='${n.weight}' count='${n.count}' cx='${n.x}' cy='${n.y}' r='${radius}' stroke-width='0' />`
        const labelX = (n.x < (g.graphElem.clientWidth - 70)) ? n.x + radius + 2 : n.x - radius - 50
        g.graphElem.innerHTML += `<text id='${n.id}-label' x='${labelX}' y='${n.y + 5}'>${n.weight} x ${n.count}</text>`
    }

    function getNodePosition(g, node, positions) {
        let x = getRandomBetween(node.weight, g.graphElem.clientWidth - (node.weight * 2))
        let y = getRandomBetween(node.weight, g.graphElem.clientHeight - (node.weight * 2))
        for (let i=0; i<positions.length; ++i) {
            if (Math.abs(positions[i][0] - x) < (node.weight + positions[i][2] + g.nodePadding) &&
                Math.abs(positions[i][1] - y) < (node.weight + positions[i][2] + g.nodePadding)) {
                return getNodePosition(g, node, positions)
            }
        }
        return [x, y]
    }

    function getRandomBetween(min, max) {
        return Math.floor(Math.random() * max) + min
    }

    function drawAvailableEdges(g) {
        const edgeElems = []
        g.edges.forEach(e => {
            edgeElems.push(`<span id='E${e.id}' data-weight='${e.weight}' class='edge' style='height: ${e.weight * 2}px;'>${e.weight}</span>`)
        })
        g.edgesElem.innerHTML = edgeElems.join('\n')
    }

    main()

})();
