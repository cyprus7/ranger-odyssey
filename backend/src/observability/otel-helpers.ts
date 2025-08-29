// This file provides OpenTelemetry-based helpers to replace deprecated custom span functions.
// Use withOtelSpan for wrapping async operations with automatic tracing and error handling.
// No deprecated APIs are used here; all based on stable OTel SDK.
import { trace, SpanStatusCode } from '@opentelemetry/api'
const tracer = trace.getTracer('quests')

export async function withOtelSpan<T>(
    name: string,
    fn: () => Promise<T>,
    attrs?: Record<string, unknown>,
): Promise<T> {
    return await tracer.startActiveSpan(name, async span => {
        if (attrs) span.setAttributes(attrs as Record<string, string | number | boolean>)
        try {
            const res = await fn()
            span.end()
            return res
        } catch (err: unknown) {
            span.recordException(err instanceof Error ? err : new Error(String(err)))
            span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) })
            span.end()
            throw err
        }
    })
}
