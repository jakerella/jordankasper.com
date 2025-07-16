import { BlobsServer } from '@netlify/blobs/server'

const token = process.env.NETLIFY_BLOBS_TOKEN
const port = 3001

const server = new BlobsServer({
    directory: './test-blobs',
    port,
    token,
    onRequest: ({ type, url }) => {
        console.log(`${type} request to ${url}`)
    }
})

await server.start()

console.log(`*** Blobs server started on port ${port}`)
