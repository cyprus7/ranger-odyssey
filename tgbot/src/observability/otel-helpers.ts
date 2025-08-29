import { trace } from '@opentelemetry/api'

export async function withOtelSpan<T>(
    name: string,
    fn: () => Promise<T>,
    attrs?: Record<string, string | number | boolean>
): Promise<T> {
    return trace.getTracer('tgbot').startActiveSpan(name, { attributes: attrs }, async (span) => {
        try {
            const result = await fn()
            span.setStatus({ code: 1 }) // OK
            return result
        } catch (error) {
            span.recordException(error as Error)
            span.setStatus({ code: 2, message: (error as Error).message }) // ERROR
            throw error
        } finally {
            span.end()
        }
    })
}
