/*
This is a simple script to compare finding useful data in a large (structured) dataset
using one of two methods:
    (a) a single, well crafted regular expression, or
    (b) line-by-line iteration using split() and indexOf

The goal was to demonstrate the speed and memory efficiency that regular expressions have.
In my testing, the regex version consistently ran in about 17 ms and used about 60 KB of 
memory over 50 runs (on average). On the other hand, the line-by-line iteration easily 
took twice as long at about 35 ms and used ten times the memory at over 6,000 KB (again, 
on average over 50 runs).

Try it yourself: node compare-methods.js
*/

const fs = require('fs')

const count = 50
const regex = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}) (?:DEBUG|INFO|WARN|ERROR)\s+((?:\d{1,3}\.){3}\d{1,3})\s+403 .+? restricted resource: (.+)$/gm
const log = fs.readFileSync('app.log.txt').toString()

const matchCount = log.matchAll(regex).toArray().length


let regexTime = 0
let regexMemory = 0
for (let i=0; i<count; ++i) {
    const [time, memory] = regexScan(log)
    regexTime = (regexTime + time) / 2
    regexMemory = (regexMemory + memory) / 2
}

let iterationTime = 0
let iterationMemory = 0
for (let i=0; i<count; ++i) {
    const [time, memory] = lineByLineIteration(log)
    iterationTime = (iterationTime + time) / 2
    iterationMemory = (iterationMemory + memory) / 2
}


console.log(`
On average (over ${count} runs), to find ${matchCount} matches (with subgroups)...

  RegEx scan took ${Math.round(regexTime)} ms and used ${Math.round((regexMemory / 1024) * 100) / 100} KB

  Iteration scan took ${Math.round(iterationTime)} ms and used ${Math.round((iterationMemory / 1024) * 100) / 100} KB
`)



function regexScan(log) {
    const timeStart = Date.now()
    const memoryStart = process.memoryUsage().heapUsed
    
    let matches = log.matchAll(regex).toArray()

    const memoryEnd = process.memoryUsage().heapUsed
    const regexEnd = Date.now()
    matches = null

    return [regexEnd - timeStart, memoryEnd - memoryStart]
}

function lineByLineIteration(log) {
    const timeStart = Date.now()
    const memoryStart = process.memoryUsage().heapUsed

    let matches = []
    log.split('\n').forEach(line => {
        const pieces = line.split('  ')
        const message = pieces[pieces.length-1].trim()
        if (message.indexOf('403') === 0 && message.indexOf('restricted resource: ') > 4) {
            const [_, resource] = message.split('restricted resource: ')
            const [timestamp, level, ipOrSpace, remainderOrIP] = line.split(' ')
            const ipAddress = ipOrSpace.trim() || remainderOrIP
            const match = [line, ...timestamp.split('T'), ipAddress, resource]
            matches.push(match)
        }
    })
    
    const memoryEnd = process.memoryUsage().heapUsed
    const timeEnd = Date.now()
    matches = null

    return [timeEnd - timeStart, memoryEnd - memoryStart]
}
