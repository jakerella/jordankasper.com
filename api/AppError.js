module.exports = class AppError extends Error {
    constructor(message = 'There was an error', status = 500, cause = null) {
        if (!Number.isInteger(status) || status < 100 || status > 599) { status = 500 }
        super(message, { cause: (cause instanceof Error) ? cause : undefined })
        this.status = status
    }
}