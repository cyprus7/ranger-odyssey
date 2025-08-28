import { randomUUID } from 'crypto'
import type pino from 'pino'

export type SpanEnd = (extra?: Record<string, unknown>) => void

export function startSpan(
    logger: pino.Logger,
    trace_id: string,
    name: string,
    extra: Record<string, unknown> = {}
): { span_id: string; log: pino.Logger; end: SpanEnd } {
    const span_id = randomUUID().replace(/-/g, '')
    const started = Date.now()
    const log = logger.child({ trace_id, span_id, span_name: name, ...extra })
    log.info('span.start')
    const end: SpanEnd = (more = {}) => {
        const duration = Date.now() - started
        log.info({ duration, ...more }, 'span.end')
    }
    return { span_id, log, end }
}

export async function withSpan<T>(
    logger: pino.Logger | undefined,
    trace_id: string,
    name: string,
    fn: () => Promise<T>,
    opts?: Record<string, unknown>
): Promise<T> {
    const spanLogger = logger && typeof logger.child === 'function' ? logger.child({ span: name }) : console
    const start = Date.now()
    const isPino = spanLogger !== console

    const logInfo = (obj: Record<string, unknown>, msg: string) => {
        if (isPino) {
            (spanLogger as pino.Logger).info(obj, msg)
        } else {
            console.info(msg, obj)
        }
    }

    const logError = (obj: Record<string, unknown>, msg: string) => {
        if (isPino) {
            (spanLogger as pino.Logger).error(obj, msg)
        } else {
            console.error(msg, obj)
        }
    }

    try {
        logInfo({ trace_id, ...opts }, `Starting span: ${name}`)
        const result = await fn()
        const duration = Date.now() - start
        logInfo({ trace_id, duration, ...opts }, `Completed span: ${name}`)
        return result
    } catch (error: unknown) {
        const duration = Date.now() - start
        logError({ trace_id, duration, err: error, ...opts }, `Failed span: ${name}`)
        throw error
    }
}
