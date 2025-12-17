
import { Browser , Window, XMLParser } from 'happy-dom'
import { createHash } from 'crypto'

import c from '../constants.json'

const MAX_IMAGES_SIZE = 4500000
const MAX_COMICS_PER_SOURCE = 5
const MAX_COMIC_TEXT = 300

// TODO:
// - get excerpts for articles that do not have it
// - cache images in Netlify blobs?

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
        console.error(`Hit catch all block: ${err.message || err}\n${err.stack?.split('\n')[1]}`)
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
        
        const images = []
        const imageElem = article.querySelector('img[data-format="jpeg"]')
        // let imageData = null
        if (imageElem) {
            // const imgURL = imageElem.getAttribute('src')
            // Not sure we can cache images on the client side, too much data for localStorage
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
            images.push({
                url: imageElem.getAttribute('src'),
                altText: imageElem.getAttribute('alt') || null
            })
        }

        if (title && link) {
            data.push({ id: getArticleID(link), title, link, text, images, category })
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
                // data.push(...(await getComicsFromArchive(details, since)))
            } else if (details.type === 'date-in-url') {
                // data.push(...(await getComicsByDateInUrl(details, since)))
            } else if (details.type === 'xml') {
                data.push(...(await getComicsByXML(details, since)))
            // } else if (details.type === 'xml-with-nav') {
            //     data.push(...(await getComicsByXMLWithNav(details, since)))
            }
        } catch(err) {
            console.warn(`Unable to get comics from ${details.category}: ${err.message || err}\n${err.stack?.split('\n')[1]}`)
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
        const articleData = getComicArticleData(details, article, since)
        if (articleData) { data.push(articleData) }
    }
    await browser.close()

    const comicData = data.sort((a, b) => b.timestamp - a.timestamp).slice(0, Math.min(data.length, MAX_COMICS_PER_SOURCE))
    // Not sure we can cache images on the client side, too much data for localStorage
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

async function getComicsByDateInUrl(details, since) {
    const data = []

    let sinceDate = new Date(since)
    if (!sinceDate.getTime()) {
        // this assumes 1 comic a day, but we'll just let that be our default
        sinceDate = new Date(Date.now() - (86400000 * MAX_COMICS_PER_SOURCE))
    }

    const browser = new Browser()
    const page = browser.newPage()
    let comicDate = new Date(sinceDate.getTime())
    while (comicDate.getTime() < Date.now()) {
        comicDate.setTime(comicDate.getTime() + 86400000)

        const url = details.source
            .replace('{{YYYY}}', comicDate.getFullYear())
            .replace('{{MM}}', String(comicDate.getMonth()+1).padStart(2, '0'))
            .replace('{{DD}}', String(comicDate.getDate()).padStart(2, '0'))
        
        const resp = await fetch(url)
        if (resp.status === 404) {
            continue
        } else if (resp.status !== 200) {
            console.warn(`Site failed to return content. (${resp.status})`)
            continue
        }

        page.url = details.source
        page.content = await resp.text()
        const document = page.mainFrame.document
        const article = document.querySelector(details.articles)
        if (article) {
            const comicData = getComicArticleData(details, article, since)
            if (comicData) {
                data.push(comicData)
            }
        }
    }

    await browser.close()

    return data
}

async function getComicsByXML(details, since) {
    const resp = await fetch(details.source)
    if (resp.status !== 200) {
        throw new Error(`Site failed to return content. (${resp.status})`)
    }

    let text = await resp.text()
    if (details.removeAllCDATA) {
        text = text.replaceAll('<![CDATA[', '').replaceAll(']]>', '').trim()
    }

    const document = new XMLParser(new Window()).parse(text)
    
    const data = []
    const articles = Array.from(document.querySelectorAll(details.articles))
    for (let article of articles) {
        if (details.parseAsHTML) {
            details.parseAsHTML.forEach(selector => {
                const elem = article.querySelector(selector)
                if (elem) {
                    elem.innerHTML = elem.textContent
                }
            })
        }
        const articleData = getComicArticleData(details, article, since)
        if (articleData) { data.push(articleData) }
    }

    const comicData = data.sort((a, b) => b.timestamp - a.timestamp).slice(0, Math.min(data.length, MAX_COMICS_PER_SOURCE))
    return comicData
}

function getComicArticleData(details, article, since) {
    const datePosted = new Date((details.date) ? article.querySelector(details.date)?.textContent : null)
    const timestamp = datePosted.getTime() || Date.now()

    if (since) {
        const normalizedDate = (new Date(timestamp)).toISOString().split('T')[0]
        if (normalizedDate <= since) {
            return null
        }
    }

    const title = article.querySelector(details.title)?.textContent
    const link = article.querySelector(details.link)?.getAttribute('href')
    const category = details.category
    let text = null
    if (details.body) {
        const content = article.querySelector(details.body)?.textContent
        text = content.substring(0, MAX_COMIC_TEXT) + ((content.length > MAX_COMIC_TEXT) ? '...' : '')
    }
    if (!link) {
        console.warn(`No link found for comic in ${details.category}`)
        return null
    }

    const imageElems = (Array.isArray(details.image)) ? article.querySelectorAll(details.image[0]) : article.querySelectorAll(details.image)
    if (!imageElems.length) {
        console.warn(`No image element in comic article for ${details.category}`)
        return null
    }
    
    const images = []
    Array.from(imageElems).forEach(imageElem => {
        let url = null
        let altText = null
        let source = null
        if (Array.isArray(details.image)) {
            source = imageElem.getAttribute(details.image[1])
            if (source && details.image[2]) {
                const srcRegex = new RegExp(details.image[2], 'i')
                const sourceMatch = source.match(srcRegex)
                source = (sourceMatch && sourceMatch[1]) || null
            }
        }
        if (!source) {
            source = imageElem.getAttribute('src')
        }

        url = source
        if (details.altText) {
            altText = article.querySelector(details.altText).textContent
        } else {
            altText = imageElem.getAttribute('alt') || imageElem.getAttribute('title') || null
            if (altText) { altText = altText.replaceAll('"', '\'') }
        }
        images.push({ url, altText })
    })
    
    return { id: getArticleID(link), title, link, text, images, category, timestamp }
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
