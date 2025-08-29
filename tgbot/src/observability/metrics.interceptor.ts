import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { metrics } from '@opentelemetry/api'

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest()
        const res = context.switchToHttp().getResponse()

        const meter = metrics.getMeter('tgbot')
        const counter = meter.createCounter('http_requests_total', {
            description: 'Total number of HTTP requests',
        })
        const histogram = meter.createHistogram('http_request_duration_seconds', {
            description: 'HTTP request duration in seconds',
        })

        const started = Date.now()
        return next.handle().pipe(
            tap(() => {
                const duration = (Date.now() - started) / 1000
                counter.add(1, {
                    method: req.method,
                    status_code: res.statusCode,
                    path: req.route?.path || req.url,
                })
                histogram.record(duration, {
                    method: req.method,
                    status_code: res.statusCode,
                    path: req.route?.path || req.url,
                })
            }),
        )
    }
}
