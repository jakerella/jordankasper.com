
const logger = require('./_logger')()

module.exports = function relocate(opts){
  opts.rewritePaths = opts.rewritePaths || {}

  return function (files, metalsmith, done){
    logger.info('Relocating files for output')

    const rewrites = []
    Object.keys(opts.rewritePaths).forEach(p => {
      rewrites.push({ target: opts.rewritePaths[p], re: new RegExp(p, 'i') })
    })

    Object.keys(files).forEach(f => {
      rewrites.forEach(rw => {
        if (rw.re.test(f)) {
          const target = f.replace(rw.re, rw.target)
          files[target] = files[f]
          if (files[target].permalink && rw.re.test(files[target].permalink)) {
            files[target].permalink = files[target].permalink.replace(rw.re, rw.target)
          }
          logger.debug(`Rewrote ${f} to ${target}`)
          delete files[f]
        }
      })
    })

    done()
  }
}