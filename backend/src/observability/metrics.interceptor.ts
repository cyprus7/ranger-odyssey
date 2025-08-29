import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { finalize } from 'rxjs/operators'
import { context, metrics } from '@opentelemetry/api'
import type { Request } from 'express'

const meter = metrics.getMeter('quests')
const reqCounter = meter.createCounter('http.server.requests', { description: 'Total HTTP requests' })
const errCounter = meter.createCounter('http.server.errors', { description: 'Total HTTP errors' })
const durHist = meter.createHistogram('http.server.controller.duration', {
    description: 'Controller time (ms)',
    unit: 'ms',
})

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = ctx.switchToHttp()
        const req = http.getRequest<Request & { route?: { path?: string } }>()
        const res = http.getResponse<{ statusCode: number }>()

        const method = req.method
        // попытаемся определить «логическое имя» роута:
        const route = req.route?.path || req.url || 'unknown'
        const start = process.hrtime.bigint()

        // считаем запрос
        reqCounter.add(1, { method, route })

        return next.handle().pipe(finalize(() => {
            const end = process.hrtime.bigint()
            const ms = Number(end - start) / 1e6
            const status = res.statusCode || 0
            const attrs = { method, route, status: String(status) }

            // latency
            // (экспортер применит View с бакетами; этот хист — наш кастомный)
            context.with(context.active(), () => {
                durHist.record(ms, attrs)
            })

            // ошибки
            if (status >= 400) errCounter.add(1, attrs)
        }))
    }
}
