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
    logger: pino.Logger,
    trace_id: string,
    name: string,
    fn: () => Promise<T>,
    extra: Record<string, unknown> = {}
): Promise<T> {
    const { end } = startSpan(logger, trace_id, name, extra)
    try {
        const res = await fn()
        end({ status: 'ok' })
        return res
    } catch (err) {
        end({ status: 'error', err: String(err) })
        throw err
    }
}
