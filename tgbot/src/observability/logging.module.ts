import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'
import { randomUUID } from 'crypto'
import { trace } from '@opentelemetry/api'

@Module({
    imports: [
        LoggerModule.forRoot({
            pinoHttp: {
                level: process.env.LOG_LEVEL || 'info',
                mixin() {
                    const span = trace.getActiveSpan()
                    if (!span) return {}
                    const ctx = span.spanContext()
                    return { trace_id: ctx.traceId, span_id: ctx.spanId }
                },
                formatters: {
                    level(label) {
                        return { level: label }
                    },
                },
                genReqId: (req) => {
                    const normalize = (v: unknown): string | null => {
                        if (!v) return null
                        const s = String(v).trim()
                        if (!s) return null
                        if (/^\d+$/.test(s)) return null // reject numeric-only
                        return s
                    }
                    const hdrTrace = normalize(req.headers['trace-id'])
                    const hdrXReq  = normalize(req.headers['x-request-id'])
                    return hdrTrace || hdrXReq || randomUUID()
                },
                customLogLevel: (req, res, err) => {
                    if (err || res.statusCode >= 500) return 'error'
                    return 'info'
                },
                serializers: {
                    req: (req) => ({
                        method: req.method,
                        url: req.url,
                        request_id: req.id,
                        remote_ip: req.ip,
                        user_agent: req.headers['user-agent'],
                        dedupe_key: req.body?.dedupe_key,
                    }),
                },
                autoLogging: true,
            },
        }),
    ],
})

export class LoggingModule {}
