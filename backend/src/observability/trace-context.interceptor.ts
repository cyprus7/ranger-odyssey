import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import type { Request, Response } from 'express'
import type pino from 'pino'
import { randomUUID } from 'crypto'

@Injectable()
export class TraceContextInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest<Request & { log: pino.Logger; id?: string; trace_id?: string; span_id?: string }>()
        const res = context.switchToHttp().getResponse<Response>()

        const baseLogger: pino.Logger = req.log // Request-scoped pino child
        // Генерим стабильный trace_id и корневой span_id (hex без дефисов)
        const genHex = () => randomUUID().replace(/-/g, '')

        // validate candidate id: reject purely-numeric strings (likely user ids).
        const normalizeCandidate = (val: unknown): string | null => {
            if (!val) return null
            const s = String(val).trim()
            if (!s) return null
            // If value is purely digits (e.g. user id) — treat as invalid for trace id
            if (/^\d+$/.test(s)) return null
            // remove hyphens to have compact hex-like id
            return s.replace(/-/g, '')
        }

        const hdrTrace = normalizeCandidate(req.headers['trace-id'])
        const hdrXReq  = normalizeCandidate(req.headers['x-request-id'])
        const reqIdCand = normalizeCandidate(req.id)

        const trace_id = hdrTrace || hdrXReq || reqIdCand || genHex()
        const span_id  = genHex()

        const loggerWithContext = baseLogger.child({ trace_id, span_id })
        req.logger  = loggerWithContext // alias для удобства
        req.trace_id = trace_id
        req.span_id  = span_id

        res.setHeader('trace-id', trace_id)
        if (req.id) res.setHeader('x-request-id', req.id)

        const started = Date.now()
        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - started
                loggerWithContext.info({ duration }, 'Request completed')
            }),
        )
    }
}
