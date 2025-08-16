import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'
import { randomUUID } from 'crypto'

@Module({
    imports: [
        LoggerModule.forRoot({
            pinoHttp: {
                level: process.env.LOG_LEVEL || 'info',
                genReqId: (req) => randomUUID(),
                customLogLevel: (req, res, err) => {
                    if (res.statusCode >= 500 || err) return 'error'
                    return 'info'
                },
                serializers: {
                    req: (req) => ({
                        method: req.method,
                        url: req.url,
                        request_id: req.id,
                        remote_ip: req.ip,
                        user_agent: req.headers['user-agent'],
                        dedupe_key: req.body?.dedupe_key
                    })
                },
                // pino-http automatically logs responseTime
            }
        })
    ]
})
export class ObservabilityLoggingModule {}
