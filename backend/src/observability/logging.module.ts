// src/observability/logging.module.ts
import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'
import { randomUUID } from 'crypto'
import pino from 'pino'

const baseLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
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

                genReqId: (req) =>
                    (req.headers['trace-id'] as string) ||
          (req.headers['x-request-id'] as string) ||
          randomUUID(),

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
