
import { Browser } from 'happy-dom'
import { createHash } from 'crypto'

import c from '../constants.json'

const MAX_IMAGES_SIZE = 4500000
const MAX_COMICS_RETRIEVED = 10

// TODO:
// - get excerpts for articles that do not have it

export default async function handler(req, context) {
    try {
        const queryParams = {}
        ;(req.url.split('?')[1] || '').split('&').forEach((param) => {
            const parts = param.split('=')
            queryParams[parts[0]] = parts[1]
        })

        let articles = []
        
        if (!queryParams.feed || queryParams.feed === 'news') {
            articles = await getNews()
        } else if (queryParams.feed === 'comics') {
            articles = await getComics(queryParams.since || null)
        }
        
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
            // if (totalImageSize < MAX_IMAGES_SIZE) {
            //     try {
            //         const buffer = await (await (await fetch(imgURL)).blob()).arrayBuffer()
            //         totalImageSize += buffer.byteLength
            //         const b64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)))
            //         if (b64Data) { imageData = b64Data }
            //     } catch(err) {
            //         console.debug('Unable to convert image to base64:', (err.message || err))
            //     }
            // }

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

async function getComics(since) {
    const data = []
    for (let details of c.COMICS_SITES) {
        try {
            if (details.type === 'archive') {
                data.push(...(await getComicsFromArchive(details, since)))
            }
        } catch(err) {
            console.warn(`Unable to get comics from ${c.COMICS_SITES.category}: ${err.message || err}`)
        }
    }
    return data.sort((a, b) => b.timestamp - a.timestamp)
}

async function getComicsFromArchive(details, since) {
    const resp = await fetch(details.source)
    if (resp.status !== 200) {
        throw new Error(`Site failed to return content. (${resp.status})`)
    }

    const browser = new Browser()
    const page = browser.newPage()
    page.url = details.source
    page.content = await resp.text()
    const document = page.mainFrame.document

    const data = []
    const articles = Array.from(document.querySelectorAll(details.articles))
    for (let article of articles) {
        const datePosted = new Date((details.date) ? article.querySelector(details.date)?.textContent : null)
        const timestamp = datePosted.getTime() || Date.now()

        if (since) {
            const normalizedDate = (new Date(timestamp)).toISOString().split('T')[0]
            if (normalizedDate <= since) {
                continue
            }
        }

        const title = article.querySelector(details.title)?.textContent
        const link = article.querySelector(details.link)?.getAttribute('href')
        const category = details.category
        const text = (details.body) ? article.querySelector(details.body)?.textContent : null
        const imageElem = (Array.isArray(details.image)) ? article.querySelector(details.image[0]) : article.querySelector(details.image)
        let imageUrl = null
        let imageAltText = null
        if (!imageElem) {
            console.warn(`No image element in article for ${details.category}`)
            continue
        }
        
        let imageSource = null
        if (Array.isArray(details.image)) {
            imageSource = imageElem.getAttribute(details.image[1])
            if (imageSource && details.image[2]) {
                const srcRegex = new RegExp(details.image[2], 'i')
                imageSource = imageSource.match(srcRegex)[1]
            }
        }
        if (!imageSource) {
            imageSource = imageElem.getAttribute('src')
        }

        imageUrl = imageSource
        imageAltText = imageElem.getAttribute('alt') || null
        
        if (title && link && imageUrl) {
            data.push({ id: getArticleID(link), title, link, text, imageUrl, imageAltText, category, timestamp })
        }
    }
    await browser.close()

    const comicData = data.sort((a, b) => b.timestamp - a.timestamp).slice(0, Math.min(data.length, MAX_COMICS_RETRIEVED))
    // let totalImageSize = 0
    // for (let comic of comicData) {
    //     if (totalImageSize > MAX_IMAGES_SIZE) {
    //         break
    //     }
    //     try {
    //         const buffer = await (await (await fetch(comic.imageUrl)).blob()).arrayBuffer()
    //         totalImageSize += buffer.byteLength
    //         const b64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    //         if (b64Data) { comic.imageData = b64Data }
    //     } catch(err) {
    //         console.debug('Unable to convert image to base64:', (err.message || err))
    //     }
    // }

    return comicData
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
