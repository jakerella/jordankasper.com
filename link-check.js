/**
 * A script to check a website's references for dead links. It will walk your
 * source directories, find files that match your extensions, and grab all
 * anchor tags (<a href='utl'>text</a>) or markdown style links ([text](url)).
 * For relative links (beginning with a "/"), it can either look for a 
 * matching file in your specified build directory, or it can prepend your
 * base domain and do a live check. For external links (beginning with "http")
 * it will perform a fetch. By default it will follow redirects, but you can 
 * toggle that to report them as dead links.
 * 
 * Modify the OPTIONS below, then run the script with:
 *   node link-check.js
 */

const path = require('path')
const fs = require('fs-extra')
const klaw = require('klaw')

;(() => {
    /***********************************************************************/
    /*                               OPTIONS                               */
    /***********************************************************************/
    
    // *** These are options you should most likely change...

    // SOURCES: an array of directories to walk for source files to check
    const SOURCES = [
        path.resolve(__dirname, 'content'),
        path.resolve(__dirname, 'layouts'),
        path.resolve(__dirname, 'static')
    ]
    // BASE_DOMAIN: Used to check relative links
    const BASE_DOMAIN = 'https://jordankasper.com'
    // EXTENSIONS: What file extensions for look for links in (note: only anchor tags and markdown links are supported)
    const EXTENSIONS = ['html', 'md', 'hbs']
    // EXCLUDE_REFS: A regex of href's to ignore for dead link checking
    const EXCLUDE_REFS = /^\/(?:$|mail|tel|tag\/|page\/)/
    // BUILD_DIR: A ful directory path to check for realtive links. If `null`, relative links will be live checked using the BASE_DOMAIN
    const BUILD_DIR = path.resolve(__dirname, 'build')

    // *** These are options you might want to change, but might be okay as defaults

    // LOG_LEVEL: One of [debug, log, info, warn, error]  (setting this enables logs at that level and above)
    const LOG_LEVEL = 'debug'
    // PROJECT_BASE: Used to remove full file path for relative path reporting
    const PROJECT_BASE = path.resolve('.')
    // RECURSE_DIR: whether or not walk directories recursively to find target files
    const RECURSE_DIR = true
    // OUTPUT_FILEPATH: The full file path for the output report (set this to `null` to get results in the terminal)
    const OUTPUT_FILEPATH = path.resolve(__dirname, 'link-check-results.json')
    // FOLLOW_REDIRECTS: Whether to consider a redirect a dead link
    const FOLLOW_REDIRECTS = true
    // CACHE_TTL: How long to keep the live link check cache (set this to 0 to disable caching)
    const CACHE_TTL = 14 * (1000 * 60 * 60 * 24)
    // CACHE_FILEPATH: The full file path for the live check cache
    const CACHE_FILEPATH = path.resolve(__dirname, 'link-check-cache.json')
    /***********************************************************************/


    /********************************* CONSTANTS **************************/
    const OUTPUT_WRAP = 50
    const LOG_LEVELS = { debug: 5, log: 4, info: 3, warn: 2, error: 1 }
    const COLORS = {
        debug: '\x1b[38;5;247m',
        log: '\x1b[37m',
        info: '\x1b[34m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
        reset: '\x1b[0m'
    }
    const logger = createLogger()
    /********************************* CONSTANTS **************************/


    /********************************** STARTUP ***************************/
    main()
    /**********************************************************************/


    async function main() {
        logger.info(`Scanning for dead links in ${SOURCES.length} directories with file extentions: ${EXTENSIONS.join(', ')}`)
        logger.debug(`  - ${SOURCES.join('\n   - ')}`)
        
        const files = await gatherFiles()
        logger.debug(`Found ${files.length} files to check`)
        
        const links = findLinksToCheck(files)
        logger.debug(`Found ${Object.keys(links).length} links across those ${files.length} files`)

        const cache = getLinkCheckCache()

        const results = await processLinks(links, cache)
        processResults(results)
    }


    async function gatherFiles() {
        const files = []
        const depthLimit = (RECURSE_DIR) ? -1 : 0
        for (const source of SOURCES) {
            for await (const file of klaw(source, { depthLimit })) {
                const ext = path.extname(file.path).substring(1)
                if (!file.stats.isDirectory() && EXTENSIONS.includes(ext)) {
                    let contents = null
                    try {
                        contents = fs.readFileSync(file.path).toString()
                    } catch(err) {
                        logger.warn(`Unable to read contents of ${file.path}`)
                        continue
                    }
                    files.push({
                        path: file.path,
                        ext,
                        contents
                    })
                }
            }
        }
        return files
    }

    function findLinksToCheck(files) {
        const links = {}

        const markdownLinkRegex = /\[([^\]]+)\]\(([^\)]+)\)/gi
        const otherLinkRegex = /<a.+?href=['"]([^'"]+)['"][^>]*>([^<]+)<\/a>/gi

        files.forEach((file) => {
            let fileLinks = null
            if (file.ext === 'md') {
                fileLinks = findLinksInContent(file, markdownLinkRegex, 2, 1)
            } else {
                fileLinks = findLinksInContent(file, otherLinkRegex, 1, 2)
            }

            if (fileLinks) {
                Object.keys(fileLinks).forEach((href) => {
                    if (!links[href]) {
                        links[href] = {
                            url: href,
                            paths: new Set(),
                            text: new Set()
                        }
                    }
                    links[href].paths.add(...Array.from(fileLinks[href].paths))
                    links[href].text.add(...Array.from(fileLinks[href].text))
                })
            }
            
        })
        return links
    }

    function findLinksInContent(file, re, href, text) {
        const links = {}

        const matches = file.contents.matchAll(re)
        if (matches) {
            matches.forEach((match) => {
                if (!EXCLUDE_REFS || (EXCLUDE_REFS && !EXCLUDE_REFS.test(match[href]))) {
                    if (!links[match[href]]) {
                        links[match[href]] = {
                            url: match[href],
                            paths: new Set(),
                            text: new Set()
                        }
                    }
                    links[match[href]].paths.add(file.path.split(PROJECT_BASE)[1])
                    links[match[href]].text.add(match[text])
                }
            })
        }
        return links
    }

    function getLinkCheckCache() {
        let cache = {}
        try {
            if (CACHE_TTL > 0) {
                cache = JSON.parse(fs.readFileSync(CACHE_FILEPATH).toString())
                logger.debug(`Retrieved live check cache file with ${Object.keys(cache).length} link entries`)
            } else {
                logger.debug('Not using live link cache')
            }
        } catch (err) {
            if (!/ENOENT/i.test(err.message)) {
                logger.warn(`Unable to load cache file: ${err.message || err}`)
            }
        }
        return cache
    }

    async function processLinks(links, cache) {
        const results = {
            liveCounter: 0,
            ignoreCounter: 0,
            cacheCounter: 0,
            issues: []
        }

        const urls = Object.keys(links)

        let totalCount = 0

        for (let url of urls) {
            let result = null

            if (/^#/.test(url)) {
                results.ignoreCounter++
                totalCount++
                writeSimpleResult('.', totalCount)
                continue
            }

            let basePath = (/^\//.test(url)) ? url.substring(1) : url.split(BASE_DOMAIN)[1]?.substring(1)
            if (basePath && /\?/.test(basePath)) {
                // Strip the query string because it likely doesn't matter on this domain
                basePath = basePath.split('?')[0]
            }
            if (basePath && /\/$/.test(basePath)) {
                basePath = basePath.substring(0, basePath.length-1)
            }
            
            if (basePath && BUILD_DIR) {
                const filepath = path.resolve(BUILD_DIR, basePath)
                if (
                    fs.existsSync(filepath) ||
                    fs.existsSync(path.resolve(filepath, 'index.html')) ||
                    fs.existsSync(filepath + '.html')
                ) {
                    results.ignoreCounter++
                    totalCount++
                    writeSimpleResult('.', totalCount)
                    continue
                }
            }

            if (BUILD_DIR && /^\//.test(url)) {
                result = 'Relative link path not found'
            }
            
            let output = '.'

            if (!result) {
                
                result = await checkLiveLink(url, cache)
                
                if (/\(cached\)/.test(result)) {
                    result = result.replace('(cached)', '')
                    results.cacheCounter++
                } else if (/goodcache/.test(result)) {
                    result = null
                    results.cacheCounter++
                } else {
                    results.liveCounter++
                }
            }
            
            if (result) {
                let redirect = null
                output = 'E'
                if (/not (?:resolved|found)/.test(result)) { output = 'F' }
                if (/redirected/.test(result)) {
                    redirect = result.split('to: ')[1]
                    output = 'R'
                }
                results.issues.push({
                    url,
                    result,
                    paths: Array.from(links[url].paths),
                    text: Array.from(links[url].text),
                    redirect
                })
            }
            totalCount++
            writeSimpleResult(output, totalCount)
        }
        process.stdout.write('\n')
        return results
    }

    function writeSimpleResult(output, total=0) {
        process.stdout.write(output)
        if (total % OUTPUT_WRAP === 0) {
            process.stdout.write(` (${total})\n`)
        }
    }

    async function checkLiveLink(url, cache={}) {
        if (cache[url] && cache[url].exp > Date.now()) {
            return (cache[url].msg) ? (cache[url].msg + ' (cached)') : 'goodcache'
        }

        let msg = null
        try {
            
            // TODO: this fails on sites that implement CORS strictly
            // I could switch to using a headless browser like puppeteer?
            const resp = await fetch(url)

            if (!FOLLOW_REDIRECTS && resp.redirected) {
                const base = url.split('://')[1]
                const redirectBase = resp.url.split('://')[1]
                // Check for http -> https upgrading, which we'll ignore for redirection purposes
                if (base !== redirectBase) {
                    msg = `URL redirected to: ${resp.url}`
                }
            } else if (resp.status === 404) {
                msg = `URL path not found`
            } else if (resp.status > 399) {
                msg = `Error from URL domain: ${resp.status}`
            }
        } catch(err) {
            if (err.cause?.code === 'ENOTFOUND') {
                msg = 'URL domain not resolved'
            } else {
                msg = `Error fetching URL: (${err.message || err})`
            }
        }

        if (CACHE_TTL > 0) {
            cache[url] = { exp: Date.now() + CACHE_TTL, msg }
            fs.writeFileSync(CACHE_FILEPATH, JSON.stringify(cache))
        }

        return msg
    }

    function processResults(results) {
        logger.debug(`
 Ran live check on ${results.liveCounter} links
 Ignored ${results.ignoreCounter} links to confirmed internal files
 Used ${results.cacheCounter} cached results`)
        
        if (results.issues.length) {
            if (OUTPUT_FILEPATH) {
                const paths = organizeIssuesByPath(results.issues)
                fs.writeFileSync(OUTPUT_FILEPATH, JSON.stringify(paths, null, 4))
                
                logger.warn(`Wrote ${results.issues.length} dead links to ${OUTPUT_FILEPATH}`)

            } else {
                logger.warn(`Found ${results.issues.length} dead links!`)
                logger.warn(
                    results.issues.map(issue => {
                        return `  Dead Link (${issue.result}): ${issue.url}\n    "${issue.text}" in: ${issue.paths.join(', ')}`
                    })
                    .join('\n')
                )
            }
        } else {
            logger.info('No dead links found!')
        }
    }

    function organizeIssuesByPath(issues) {
        const paths = {}

        issues.forEach((issue) => {
            issue.paths.forEach((path) => {
                if (!paths[path]) {
                    paths[path] = { urls: [] }
                }
                paths[path].urls.push({
                    url: issue.url,
                    result: issue.result,
                    text: issue.text
                })
                if (issue.redirect) {
                    paths[path].urls[paths[path].urls.length-1].redirectsTo = issue.redirect
                }
            })
        })

        return paths
    }

    function createLogger() {
        const logger = {}
        Object.keys(LOG_LEVELS).forEach((level) => {
            logger[level] = (...args) => {
                if (LOG_LEVELS[LOG_LEVEL] < LOG_LEVELS[level]) { return }
                console[level].apply(console, [COLORS[level], ...args, COLORS.reset])
            }
        })
        process.stdout.write(`${COLORS.reset}`)
        return logger
    }

})();