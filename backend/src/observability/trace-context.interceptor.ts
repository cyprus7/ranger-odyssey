import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { PinoLogger } from 'nestjs-pino'

@Injectable()
export class TraceContextInterceptor implements NestInterceptor {
    constructor(private readonly logger: PinoLogger) {}
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest()
        const res = context.switchToHttp().getResponse()

        const trace_id = req.headers['trace-id'] || req.id
        const span_id = req.headers['span-id'] || req.id

        // Use child to add trace information to the logger context
        this.logger.assign({ trace_id, span_id })
        const loggerWithContext = this.logger

        // Send these IDs back in response headers
        res.setHeader('trace-id', trace_id)
        res.setHeader('x-request-id', req.id)

        const now = Date.now()
        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - now
                loggerWithContext.info({ duration }, 'Request completed')
            })
        )
    }
}
