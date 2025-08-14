import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        // JSON output without color: do not configure pino-pretty
        genReqId: (req) => uuidv4(),
        customLogLevel: (req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          return 'info';
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
