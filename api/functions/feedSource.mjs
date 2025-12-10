
import { Browser } from 'happy-dom'

import c from '../constants.json'

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
    Array.from(document.querySelectorAll('article.post-type-simple, article.post-type-minimal'))
        .forEach(article => {
            const title = article.querySelector('h3')?.textContent
            const link = article.querySelector('a:has(h3)')?.getAttribute('href')
            const category = article.querySelector('h2.slug')?.textContent
            const text = article.querySelector('.teaser')?.textContent
            const imageElem = article.querySelector('img[data-format="jpeg"]')
            let image = null
            let altText = null
            if (imageElem) {
                image = imageElem?.getAttribute('src')
                altText = imageElem?.getAttribute('alt')
            }
            if (title && link) {
                data.push({ title, link, text, image, altText, category })
            }
        })
    await browser.close()

    return data
}


export const config = {
    rateLimit: {
        windowLimit: 20,
        windowSize: 60,
        aggregateBy: ['ip', 'domain']
    }
}
