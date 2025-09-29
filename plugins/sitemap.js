const path = require('path')
const fs = require('fs-extra')
const logger = require('./_logger')()

module.exports = function sitemap(opts){
  opts.exclude = opts.exclude || '\\.(png|jpg|gif|svg|js|css)$'
  opts.stripIndex = (typeof(opts.stripIndex) === 'boolean') ? opts.stripIndex : true
  opts.excludeOthers = (typeof(opts.excludeOthers) === 'boolean') ? opts.excludeOthers : false
  opts.scanForPaths = (Array.isArray(opts.scanForPaths)) ? opts.scanForPaths : []
  opts.rewritePaths = opts.rewritePaths || {}
  opts.defaultPriority = Number(opts.defaultPriority) || 0.5
  opts.priorities = opts.priorities || { '/': 1.0 }
  opts.sitemapFilename = opts.sitemapFilename || 'sitemap.xml'

  return function (files, metalsmith, done){
    logger.debug('Generating list of paths for sitemap')

    if (files[opts.sitemapFilename]) {
      logger.warn(`There is already an entry in Metalsmith\'s files for ${opts.sitemapFilename}!`)
      return
    }

    const metadata = metalsmith.metadata()
    const source = metalsmith.source()

    const excludeRegex = new RegExp(opts.exclude, 'i')
    const keys = Object.keys(files).filter(f => !excludeRegex.test(f))
    const pages = []

    keys.forEach(k => {
      const entry = { source: path.join(source, files[k].path), path: null }
      if (files[k].permalink === '.') {
        entry.path = '/'
      } else if (files[k].permalink) {
        entry.path = '/' + files[k].permalink
      } else {
        if (opts.stripIndex && /\/index\.html$/.test(files[k].path)) {
          entry.path = '/' + files[k].path.replace(/\/index\.html$/, '')
        } else if (!opts.excludeOthers) {
          entry.path = '/' + files[k].path
        }
      }
      pages.push(entry)
    })

    opts.scanForPaths.forEach(pathname => {
      const base = path.join(__dirname, '..', pathname)
      const scannedPaths = scanDir(base).values().toArray().map(p => {
        return { source: path.join(p, 'index.html'), path: p.replace(base, '') }
      })
      pages.push(...scannedPaths)
    })
    
    logger.info(`Generating sitemap with ${pages.length} paths`)
    
    const priorities = []
    Object.keys(opts.priorities).forEach(p => {
      priorities.push({ score: opts.priorities[p], re: new RegExp(p, 'i') })
    })

    const sitemapContent = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]
    pages.forEach((page) => {
      if (!page.path) { return }

      let priority = opts.defaultPriority
      priorities.forEach(p => {
        if (p.re.test(page.source)) {
          priority = p.score
        }
      })

      let mod = (new Date()).toISOString().split('T')[0]

      sitemapContent.push(`
        <url>
          <loc>${metadata.url}${page.path}</loc>
          <lastmod>${mod}</lastmod>
          <priority>${priority}</priority>
        </url>`
      )
    })
    sitemapContent.push('</urlset>')

    files[opts.sitemapFilename] = {
      title: 'Sitemap',
      contents: Buffer.from(sitemapContent.join('\n')),
      mode: '0644'
    }

    done()
  }

  function scanDir(base, paths) {
    paths = paths || new Set()
    const contents = fs.readdirSync(base)
    for (let i=0; i<contents.length; ++i) {
      let stats = fs.statSync(path.join(base, contents[i]))
      if (stats.isDirectory()) {
        paths = new Set([...scanDir(path.join(base, contents[i]), paths)])
      } else if (contents[i] === 'index.html') {
        paths.add(base)
      }
    }
    return paths
  }

}
