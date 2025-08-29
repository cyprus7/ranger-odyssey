// src/observability/logging.module.ts
import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'
import { randomUUID } from 'crypto'
import pino from 'pino'
import { trace } from '@opentelemetry/api'

const baseLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    mixin() {
        const span = trace.getActiveSpan()
        if (!span) return {}
        const ctx = span.spanContext()
        return { trace_id: ctx.traceId, span_id: ctx.spanId }
    },
    // аналог useLevelLabels: пишем текстовый уровень в поле "level"
    formatters: {
        level(label) {
            return { level: label }
        },
    },
})

@Module({
    imports: [
        LoggerModule.forRoot({
            pinoHttp: {
                // ВАЖНО: передаём ИМЕННО инстанс, не объект опций
                logger: baseLogger,

                // Validate header values: ignore purely-numeric values (likely user ids).
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
export class ObservabilityLoggingModule {}
