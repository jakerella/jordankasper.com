
const LEVELS = {
    DEBUG: 5,
    LOG: 4,
    INFO: 3,
    WARN: 2,
    ERROR: 1,
    OFF: 0
}
const DEFAULT_LEVEL = 'INFO'
const DEFAULT_MESSAGE_LEVEL = 'LOG'
const LOG_METHDOS = [null, 'error', 'warn', 'info', 'log', 'debug']
const COLORS = {
    DEBUG: '\x1b[37m',
    LOG: '\x1b[37m',
    INFO: '\x1b[34m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    RESET: '\x1b[0m'
}

let loggerInstance = null

module.exports = function createLogger(opts = {}) {
    if (loggerInstance) { return loggerInstance }
    
    const loggerLevel = (LEVELS[opts.level] === undefined) ? (process.env.DEBUGLEVEL || DEFAULT_LEVEL) : opts.level

    if (loggerLevel === 'DEBUG') {
        console.debug(`${COLORS.DEBUG}Creating logger with level ${loggerLevel}${COLORS.RESET}`)
    }

    function writeLog(level, args) {
        level = (LEVELS[level] === undefined) ? DEFAULT_MESSAGE_LEVEL : level
        args = (args.splice) ? args : [ args ]

        if ( LEVELS[loggerLevel] < LEVELS[level] ) { return }

        const message = [COLORS[level], args[0]]

        if (args.length > 1) {
            args.slice(1).forEach((a) => {
                if (typeof(a) === 'object') {
                    message.push('\n')
                    message.push(JSON.stringify(a))
                    message.push('\n')
                } else {
                    message.push(a)
                }
            })
        }

        message.push(COLORS.RESET)

        console[LOG_METHDOS[LEVELS[level]]].apply( console, [message.join(' ')] )
    }

    loggerInstance = function() {
        writeLog('LOG', Array.from(arguments))
    }
    loggerInstance.debug = function() { writeLog('DEBUG', Array.from(arguments)) }
    loggerInstance.log = function() { writeLog('LOG', Array.from(arguments)) }
    loggerInstance.info = function() { writeLog('INFO', Array.from(arguments)) }
    loggerInstance.warn = function() { writeLog('WARN', Array.from(arguments)) }
    loggerInstance.error = function() { writeLog('ERROR', Array.from(arguments)) }

    return loggerInstance
};
