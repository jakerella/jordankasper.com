
import { readFileSync } from 'fs'
import path from 'path'
import moment from 'moment-timezone'
import { GoogleGenAI } from '@google/genai'
import { getStore } from '@netlify/blobs'
import AppError from '../AppError'
import c from '../constants.json'
import weatherCodes from '../weather-codes.json'


// HOW TO USE:
// await (await fetch('/.netlify/functions/getWeather?date=tomorrow', { headers: { Authorization: 'local-weather-test'} })).json()

// TODO: allow location by name

const DEFAULT_OPTIONS = {
    date: 'today',
    lat: 38.89,
    lng: -77.04,
    timezone: 'America/New_York',
    humidity_break: 0.80,
    wind_break: 5,
    high_temp_break: 90,
    low_temp_break: 30,
    wind_speed_unit: 'mph',
    temperature_unit: 'fahrenheit',
    precipitation_unit: 'inch'
}
const FORECAST_TTL = (1000 * 60 * 60 * 2)  // 2 hour timeout on cached forecasts
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const FIELD_MAP = {
    time: 'time',
    temperature_2m: 'actual temperature',
    apparent_temperature: 'feels like temperature',
    precipitation_probability: 'probability of precipitation',
    precipitation: 'precipitation amount',
    uv_index: 'UV index',
    cloud_cover: 'cloud cover percent',
    relative_humidity_2m: 'relative humidity percent',
    wind_speed_10m: 'wind speed',
    wind_gusts_10m: 'wind gust speed',
    wind_direction_10m: 'wind direction degrees'
}
const AI_INSTRUCTION = readFileSync(path.join(__dirname, '..', 'weather-instruction.txt')).toString()


export default async function handler(req, context) {
    try {
        if (req.headers.get('AUTHORIZATION') !== Netlify.env.get('WEATHER_AUTH_KEY')) {
            throw new AppError('Please provide a valud authorization key', 403)
        }

        const options = parseInputAndValidate(req)
        const forecastSimpleDate = options.forecastDate.format('YYYY-MM-DD')

        const store = getStore({ name: c.ANALYTICS_STORE })

        let forecast = await getCachedForecast(options, store)
        if (forecast) {
            console.debug(`Using cached forecast for ${options.lat}, ${options.lng} on ${options.forecastDate}`)
            return new Response(JSON.stringify({
                forecast,
                forecastDate: forecastSimpleDate,
                ...options
            }), { status: 200 })
        }

        const historicalData = await getHistoricalData(options, store)
        console.debug(`Historical weather data for ${options.lat, options.lng}: ${JSON.stringify(historicalData)}`)

        const weatherData = await getWeatherData(options)
        
        weatherData['current date and time'] = options.now.format('MMMM D, YYYY HH:mm')
        weatherData['previous year averages'] = historicalData

        forecast = await getForecast(options, weatherData, store)
        console.log(`FORECAST for ${options.forecastDate.format('dddd, MMMM D, YYYY')}:\n`, forecast)

        return new Response(JSON.stringify({
            forecast,
            forecastDate: forecastSimpleDate,
            ...options
        }), { status: 200 })

    } catch(err) {
        const message = (Number.isInteger(err.status) && err.status < 500) ? err.message : 'Unable to retrieve weather data'
        const status = (Number.isInteger(err.status)) ? err.status : 500
        if (status > 499) {
            console.error(`ERROR: ${err.message || err.toString()}\n${err.stack.split('\n')[1]}`)
        }
        return new Response(JSON.stringify({ message, status }), { status })
    }
}


function parseInputAndValidate(req) {
    const queryParams = {}
    ;(req.url.split('?')[1] || '').split('&').forEach((param) => {
        const [n, value] = param.split('=')
        const name = n.toLowerCase()
        const nValue = Number(value)
        if (DEFAULT_OPTIONS[name] && value) {
            queryParams[name] = (nValue || nValue === 0) ? nValue : value.toLowerCase()
        }
    })

    const options = {
        ...DEFAULT_OPTIONS,
        ...queryParams
    }

    if (typeof(options.lat) !== 'number' || typeof(options.lng) !== 'number' ||
        options.lat < -90 || options.lat > 90 || options.lng < -180 || options.lng > 180) {
        console.warn(`Invalid lat, lng inputs: ${options.lat}, ${options.lng}`)
        throw new AppError('Invalid location coordinates for forecast', 400)
    }

    let now = moment()
    if (typeof(options.timezone) === 'number') {
        now.utcOffset(options.timezone)
    } else if (typeof(options.timezone) === 'string') {
        now.tz(options.timezone)
    } else {
        now.tz(Intl.DateTimeFormat().resolvedOptions().timeZone)
    }
    const tz = now.zoneAbbr()
    const today = now.format('YYYY-MM-DD')
    
    let forecastDate = now.clone()
    if (/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
        forecastDate = moment.tz(options.date, tz)
        if (!forecastDate.isValid()) {
            console.warn(`Invalid YYYY-MM-DD date input: ${options.date}`)
            throw new AppError('Invalid date for forecast', 400)
        }
        const diff = forecastDate.diff(now, 'days')
        if (diff < 0 || diff > 6) {
            console.warn(`Date input is out of range: ${options.date}`)
            throw new AppError('Invalid date for forecast', 400)
        }
    } else if (DAYS.includes(options.date)) {
        const currDayIndex = DAYS.indexOf(now.format("dddd").toLowerCase())
        const desiredDayIndex = DAYS.indexOf(options.date)
        if (desiredDayIndex > currDayIndex) {
            forecastDate.add(desiredDayIndex - currDayIndex, 'days')
        } else {
            forecastDate.add((7 - currDayIndex) + desiredDayIndex, 'days')
        }
    } else if (options.date === 'tomorrow') {
        forecastDate = forecastDate.add(1, 'days')
    } else if (options.date !== 'today') {
        console.warn(`Invalid date input for forecast: ${options.date}`)
        throw new AppError('Invalid date for forecast', 400)
    }

    return { ...options, forecastDate, now }
}

async function getCachedForecast(options, store) {
    const forecastCache = (await store.get(c.WEATHER_FORECAST_KEY, { type: 'json' })) || {}
    const today = options.now.format('YYYY-MM-DD')
    const forecastSimpleDate = options.forecastDate.format('YYYY-MM-DD')

    let forecast = null
    Object.keys(forecastCache).forEach((date) => {
        if (date < today) {
            delete forecastCache[date]
        } else {
            Object.keys(forecastCache[date]).forEach((coord) => {
                if (Date.now() > forecastCache[date][coord].exp) {
                    delete forecastCache[date][coord]
                } else if (date === forecastSimpleDate && coord === `${options.lat}_${options.lng}`) {
                    forecast = forecastCache[date][coord].txt
                }
            })
        }
    })
    return forecast
}

async function getHistoricalData(options, store) {
    const historicalCache = (await store.get(c.WEATHER_HISTORY_KEY, { type: 'json' })) || {}
    const lastYear = Number(options.forecastDate.format('YYYY')) - 1
    const forecastWeek = Number(options.forecastDate.format('W')) - 1
    const coord = `${options.lat}_${options.lng}`
    
    if (historicalCache[lastYear] && historicalCache[lastYear][coord]) {
        console.debug(`Using cached historical data for ${lastYear} at ${coord}`)
        return {
            'average low temperature': historicalCache[lastYear][coord][forecastWeek][0],
            'average high temperature': historicalCache[lastYear][coord][forecastWeek][1]
        }
    }

    console.debug(`Retrieving historical weather data for ${lastYear} at ${coord}`)
    const resp = await fetch('https://archive-api.open-meteo.com/v1/archive?' + [
        `latitude=${options.lat}&longitude=${options.lng}`,
        `start_date=${lastYear}-01-01&end_date=${lastYear}-12-31&timezone=auto`,
        'daily=temperature_2m_max,temperature_2m_min,precipitation_sum',
        `temperature_unit=${options.temperature_unit}&precipitation_unit=${options.precipitation_unit}`
    ].join('&'))
    if (resp.status > 299) {
        const data = await resp.text()
        throw new AppError(`Unable to get historical weather data (${resp.status}): ${data}`, 500)
    }
    const historicalData = await resp.json()

    historicalCache[lastYear] = historicalCache[lastYear] || {}
    historicalCache[lastYear][coord] = []
    
    let dayCount = 0
    let weekHighTotal = 0
    let weekLowTotal = 0
    for (let i=0; i<historicalData.daily.time.length; ++i) {
        weekHighTotal += historicalData.daily.temperature_2m_max[i]
        weekLowTotal += historicalData.daily.temperature_2m_min[i]
        dayCount++
        if (dayCount > 6) {
            historicalCache[lastYear][coord].push([
                Math.round(weekLowTotal / 7),
                Math.round(weekHighTotal / 7),
            ])
            dayCount = 0
            weekHighTotal = 0
            weekLowTotal = 0
        }
    }
    
    console.debug(`Caching historical data for ${lastYear} at ${coord}`)
    await store.setJSON(c.WEATHER_HISTORY_KEY, historicalCache)

    return {
        'average low temperature': historicalCache[lastYear][coord][forecastWeek][0],
        'average high temperature': historicalCache[lastYear][coord][forecastWeek][1]
    }
}

async function getWeatherData(options) {
    const prevDate = options.forecastDate.clone().add(-1, 'days').format('YYYY-MM-DD')
    const nextDate = options.forecastDate.clone().add(1, 'days').format('YYYY-MM-DD')

    const resp = await fetch('https://api.open-meteo.com/v1/forecast?' + [
        `latitude=${options.lat}&longitude=${options.lng}`,
        'current=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m',
        'daily=sunset,sunrise,temperature_2m_max,precipitation_sum,winddirection_10m_dominant',
        'hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,uv_index,cloud_cover,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code',
        `timezone=${options.timezone}`,
        `start_date=${prevDate}&end_date=${nextDate}`,
        `wind_speed_unit=${options.wind_speed_unit}&temperature_unit=${options.temperature_unit}&precipitation_unit=${options.precipitation_unit}`
    ].join('&'))
    
    if (resp.status > 299) {
        const data = await resp.text()
        throw new AppError(`Unable to get weather forecast data (${resp.status}): ${data}`, 500)
    }

    const rawData = await resp.json()
    const weatherData = { 'previous day': [], 'forecast day': [], 'following day': [] }
    const elements = Object.keys(rawData.hourly).filter(key => FIELD_MAP[key])
    for (let i=0; i<rawData.hourly.time.length; ++i) {
        let day = 'previous day'
        if (i > 23) { day = 'forecast day' }
        if (i > 47) { day = 'following day' }
        const hourlyData = {}
        elements.forEach(e => {
            hourlyData[FIELD_MAP[e]] = rawData.hourly[e][i]
        })
        const weatherCode = weatherCodes[rawData.hourly.weather_code[i]]
        hourlyData['weather description'] = weatherCode.description
        if (weatherCode.category === 'rain' || weatherCode.category === 'snow') {
            hourlyData['precipitation type'] = weatherCode.category
        } else if (rawData.hourly.precipitation_probability[i] > 4) {
            if (rawData.hourly.temperature_2m[i] < 35) {
                hourlyData['precipitation type'] = 'snow'
            } else {
                hourlyData['precipitation type'] = 'rain'
            }
        }
        weatherData[day].push(hourlyData)
    }
    return weatherData
}

async function getForecast(options, data, store) {
    const forecastDateSimple = options.forecastDate.format('YYYY-MM-DD')
    let prompt = 'Generate a forecast'
    if (forecastDateSimple === options.now.format('YYYY-MM-DD')) {
        prompt = 'Generate a forecast for today. Include current conditions as well as any significant weather activity for the remainder of today. '
        if (Number(options.forecastDate.format('H')) > 17) {
            prompt += 'Include a very brief summary of the weather for the following day as well.'
        }
    } else {
        prompt = `Generate a forecast for ${options.forecastDate.format('dddd')} whose date is ${forecastDateSimple}. This is a date in the future. Do not include any information about current conditions. Do not use terms like "this morning" or "this afternoon" and instead use "${options.forecastDate.format('dddd')} morning" or "${options.forecastDate.format('dddd')} afternoon". Your forecast should cover weather for the entire day on ${forecastDateSimple}.`
    }

    console.debug('Generating a forecast using prompt:\n', prompt)

    const ai = new GoogleGenAI({ apiKey: Netlify.env.get('GEN_AI_KEY') })
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            { text: prompt },
            { inlineData: { data: btoa(JSON.stringify(data)), mimeType: 'application/json' } }
        ],
        config: {
            systemInstruction: AI_INSTRUCTION
        }
    })

    const forecast = response.text

    const forecastCache = (await store.get(c.WEATHER_FORECAST_KEY, { type: 'json' })) || {}
    const coord = `${options.lat}_${options.lng}`
    console.debug(`Caching forecast data for on ${coord} on ${forecastDateSimple}`)
    if (!forecastCache[forecastDateSimple]) {
        forecastCache[forecastDateSimple] = {}
    }
    forecastCache[forecastDateSimple][coord] = {
        exp: Date.now() + FORECAST_TTL,
        txt: forecast
    }
    await store.setJSON(c.WEATHER_FORECAST_KEY, forecastCache)
    
    return forecast
}


export const config = {
    // path: '/api/getWeather',
    rateLimit: {
        windowLimit: 20,
        windowSize: 60,
        aggregateBy: ['ip', 'domain']
    }
}
