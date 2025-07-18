
const blobs = require('@netlify/blobs')
const countries = require('../countries.json')

const c = require('../constants.json')

module.exports = { handler }


async function handler(req, context) {
    try {

        return { statusCode: 200, body: JSON.stringify({
            foo: 'bar',
            count: 5
        }) }

    } catch(err) {
        console.error(`Hit catch all block: ${err.message || err.toString()}`)
        return { statusCode: 500, body: 'Unable to retrieve analytic data' }
    }
}
