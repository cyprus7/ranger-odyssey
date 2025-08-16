import pino from 'pino'

const logger = pino({
    browser: {
        asObject: true, // Log as JSON objects in the browser console
    },
    level: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
})

export default logger
