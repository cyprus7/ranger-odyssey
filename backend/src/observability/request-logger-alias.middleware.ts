import { Injectable, NestMiddleware } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express-serve-static-core'
import type pino from 'pino'

@Injectable()
export class RequestLoggerAliasMiddleware implements NestMiddleware {
    use(req: Request & { log?: pino.Logger; id?: string }, res: Response, next: NextFunction) {
        req.logger = req.log as pino.Logger // Alias for compatibility

        if (req.id) {
            res.setHeader('trace-id', req.id)
            res.setHeader('x-request-id', req.id)
        }
        next()
    }
}
