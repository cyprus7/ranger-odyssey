import 'express'
import type pino from 'pino'

declare module 'express-serve-static-core' {
    interface Request {
        id: string
        log: pino.Logger     // из pino-http
        logger: pino.Logger  // наш алиас
        trace_id?: string
        span_id?: string
        user?: { id: string } // из JWT guard
    }
}
