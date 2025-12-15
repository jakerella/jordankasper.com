
import { Browser } from 'happy-dom'
import { createHash } from 'crypto'

import c from '../constants.json'

const MAX_IMAGES_SIZE = 4500000

// TODO:
// - get excerpts for articles that do not have it

export default async function handler(req, context) {
    try {
        const queryParams = {}
        ;(req.url.split('?')[1] || '').split('&').forEach((param) => {
            const parts = param.split('=')
            queryParams[parts[0]] = parts[1]
        })

        const articles = await getNews()
        
        return new Response(JSON.stringify(articles), { status: 200 })

    } catch(err) {
        console.error(`Hit catch all block: ${err.message || err.toString()}\n${err.stack?.split('\n')[1]}`)
        return new Response('Unable to retrieve news articles', { status: 500 })
    }
}

async function getNews() {
    const resp = await fetch(c.NEWS_URL)
    if (resp.status !== 200) {
        throw new Error(`News site (${c.NEWS_URL}) failed to return content. (${resp.status})`)
    }

    const browser = new Browser()
    const page = browser.newPage()
    page.url = c.NEWS_URL
    page.content = await resp.text()
    const document = page.mainFrame.document

    const data = []
    const articles = Array.from(document.querySelectorAll('article.post-type-simple, article.post-type-minimal'))
    let totalImageSize = 0
    for (let article of articles) {
        const title = article.querySelector('h3')?.textContent
        const link = article.querySelector('a:has(h3)')?.getAttribute('href')
        const category = article.querySelector('h2.slug')?.textContent.trim()
        const text = article.querySelector('.teaser')?.textContent
        const imageElem = article.querySelector('img[data-format="jpeg"]')
        let imageUrl = null
        let imageData = null
        let imageAltText = null
        if (imageElem) {
            const imgURL = imageElem.getAttribute('src')
            if (totalImageSize < MAX_IMAGES_SIZE) {
                try {
                    const buffer = await (await (await fetch(imgURL)).blob()).arrayBuffer()
                    totalImageSize += buffer.byteLength
                    const b64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)))
                    if (b64Data) { imageData = b64Data }
                } catch(err) {
                    console.debug('Unable to convert image to base64:', (err.message || err))
                }
            }

            imageUrl = imgURL
            imageAltText = imageElem.getAttribute('alt') || null
        }
        if (title && link) {
            data.push({ id: getArticleID(link), title, link, text, imageUrl, imageData, imageAltText, category })
        }
    }
    await browser.close()

    return data
}

function getArticleID(link) {
    return createHash('sha1').update(link).digest('hex').toString()
}


export const config = {
    rateLimit: {
        windowLimit: 20,
        windowSize: 60,
        aggregateBy: ['ip', 'domain']
    }
}
