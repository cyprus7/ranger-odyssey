import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import * as jwt from 'jsonwebtoken'
import type { Request } from 'express'

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
    const out: Record<string, string> = {}
    if (!cookieHeader) return out
    for (const part of cookieHeader.split(';')) {
        const [k, ...rest] = part.trim().split('=')
        if (!k) continue
        out[k] = decodeURIComponent(rest.join('=') || '')
    }
    return out
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly jwtSecret = process.env.JWT_SECRET!
    private readonly cookieName = process.env.COOKIE_NAME ?? 'app_access'

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>()
        const auth = req.headers['authorization']
        let token: string | undefined
        if (auth?.startsWith('Bearer ')) token = auth.slice(7)
        if (!token) {
            const cookies = parseCookieHeader(req.headers['cookie'])
            token = cookies[this.cookieName]
        }
        if (!token) throw new UnauthorizedException('missing token')
        try {
            const payload = jwt.verify(token, this.jwtSecret) as { sub?: string }
            if (!payload?.sub) throw new Error('no sub')
            ;(req as Request & { user?: { id: string } }).user = { id: String(payload.sub) }
            return true
        } catch {
            throw new UnauthorizedException('invalid token')
        }
    }
}
