const Metalsmith = require('metalsmith')
const metadata = require('metadata')

Metalsmith(__dirname)
  .source('content')
  .destination('build')
  .metadata({
    "site": "Jordan Kasper",
    "author": "Jordan Kasper",
    "description": "So long and thanks for all the fish.",
    "url": "https://jordankasper.com"
  })
  .use(metadata())
  .build((err, files) => {
    if (err) throw err
    console.info('Build success!')
  })
