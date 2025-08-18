import { Injectable, UnauthorizedException } from '@nestjs/common'
import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import { db } from '../db/drizzle-client'
import { accountLinks } from '../db/schema'
import { and, eq } from 'drizzle-orm'

type TelegramUser = { id: number; username?: string; first_name?: string; last_name?: string }

@Injectable()
export class AuthService {
    private readonly botToken = process.env.BOT_TOKEN!
    private readonly jwtSecret = process.env.JWT_SECRET!
    private readonly jwtTtlSec = Number(process.env.JWT_TTL_SEC ?? 15)
    private readonly maxAuthAgeSec = Number(process.env.TG_AUTH_MAX_AGE_SEC ?? 300)

    private parseInitData(qs: string) {
        const params = new URLSearchParams(qs)
        const obj: Record<string, string> = {}
        for (const [k, v] of params) obj[k] = v
        return obj
    }

    private buildDataCheckString(all: Record<string, string>) {
        const { hash, ...rest } = all
        const entries = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`)
        return { dataCheckString: entries.join('\n'), hash }
    }

    private calcSecretKey() {
        if (!this.botToken) {
            throw new Error('BOT_TOKEN is not set in the environment')
        }
        // Telegram spec: secret_key = SHA256(botToken)
        return crypto.createHash('sha256').update(this.botToken).digest()
    }

    private hmacHex(input: string, key: Buffer) {
        return crypto.createHmac('sha256', key).update(input).digest('hex')
    }

    validateInitData(initData: string) {
        const all = this.parseInitData(initData)
        const { dataCheckString, hash } = this.buildDataCheckString(all)
        const secretKey = this.calcSecretKey()
        if (this.hmacHex(dataCheckString, secretKey) !== hash) return null

        const authDate = Number(all['auth_date'] ?? 0)
        if (!authDate || Math.floor(Date.now()/1000) - authDate > this.maxAuthAgeSec) return null

        let user: TelegramUser | null = null
        try { 
            user = JSON.parse(all['user'] ?? '{}') 
        } catch (error) {
            return null
        }
        if (!user?.id) return null

        return { user, all }
    }

    async handleTelegramAuth(
        initData: string,
        opts?: { startParamRaw?: string; startPayload?: { site_id: string; user_id: string; ts: number; nonce: string; deeplink?: string; sign: string } },
    ) {
        const valid = this.validateInitData(initData)
        if (!valid) throw new UnauthorizedException('invalid initData')

        const tgUserId = String(valid.user.id)

        if (opts?.startPayload) {
            const siteId = String(opts.startPayload.site_id ?? opts.startPayload.site_id ?? '')
            const siteUserId = String(opts.startPayload.user_id ?? opts.startPayload.user_id ?? '')
            if (siteId && siteUserId) {
                await db
                    .insert(accountLinks)
                    .values({ telegramUserId: BigInt(tgUserId), siteId, siteUserId })
                    .onConflictDoUpdate({
                        target: [accountLinks.telegramUserId, accountLinks.siteId],
                        set: { siteUserId, updatedAt: new Date() },
                    })
            }
        }

        const payload = { sub: tgUserId, tp: 'tg' as const }
        const token = jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtTtlSec })
        return { jwt: token, maxAgeMs: this.jwtTtlSec * 1000 }
    }

    async findLink(siteId: string, tgUserId: string) {
        const rows = await db
            .select()
            .from(accountLinks)
            .where(and(eq(accountLinks.siteId, siteId), eq(accountLinks.telegramUserId, BigInt(tgUserId))))
            .limit(1)
        return rows[0] ?? null
    }
}
