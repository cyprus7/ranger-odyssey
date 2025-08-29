import { Injectable, UnauthorizedException } from '@nestjs/common'
import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import { db } from '../db/drizzle-client'
import { accountLinks, profiles } from '../db/schema'
import { and, eq } from 'drizzle-orm'
import type pino from 'pino'
import { withOtelSpan } from '../observability/otel-helpers'

type TelegramUser = { id: number; username?: string; first_name?: string; last_name?: string }

function base64UrlToBuffer(b64url: string) {
    const s = b64url.replace(/-/g, '+').replace(/_/g, '/')
    const pad = s.length % 4 ? 4 - (s.length % 4) : 0
    return Buffer.from(s + '='.repeat(pad), 'base64')
}

@Injectable()
export class AuthService {
    private readonly botToken = process.env.BOT_TOKEN!
    private readonly jwtSecret = process.env.JWT_SECRET!
    private readonly jwtTtlSec = Number(process.env.JWT_TTL_SEC ?? 900)
    private readonly maxAuthAgeSec = Number(process.env.TG_AUTH_MAX_AGE_SEC ?? 300)

    private parseInitData(qs: string) {
        const p = new URLSearchParams(qs)
        const out: Record<string, string> = {}
        p.forEach((v, k) => { out[k] = v })
        return out
    }

    private buildDataCheckString(all: Record<string, string>) {
        return Object.keys(all)
            .filter(k => k !== 'hash')
            .sort()
            .map(k => `${k}=${all[k]}`)
            .join('\n')
    }

    private calcSecretKey() {
        if (!this.botToken) throw new Error('BOT_TOKEN is not set')
        // secret_key = HMAC_SHA256("WebAppData", bot_token)
        return crypto.createHmac('sha256', 'WebAppData').update(this.botToken).digest()
    }

    private timingSafeEqualHex(aHex: string, bHex: string) {
        const a = Buffer.from(aHex, 'hex')
        const b = Buffer.from(bHex, 'hex')
        if (a.length !== b.length) return false
        return crypto.timingSafeEqual(a, b)
    }

    validateInitData(initData: string) {
        if (!initData) return null
        const all = this.parseInitData(initData)

        const givenHash = all['hash']
        console.log('Validating initData:', { all, givenHash })
        if (!givenHash) return null

        const dcs = this.buildDataCheckString(all)
        const secretKey = this.calcSecretKey()
        const expected = crypto.createHmac('sha256', secretKey).update(dcs).digest('hex')

        if (!this.timingSafeEqualHex(expected, givenHash)) console.log('Hash mismatch:', { expected, givenHash })
        if (!this.timingSafeEqualHex(expected, givenHash)) return null

        // const authDate = Number(all['auth_date'] ?? 0)
        // const now = Math.floor(Date.now() / 1000)
        // if (!authDate || now - authDate > this.maxAuthAgeSec) console.log('Auth date expired:', { authDate, now })
        // if (!authDate || now - authDate > this.maxAuthAgeSec) return null

        let user: TelegramUser | null = null
        try { user = JSON.parse(all['user'] ?? '{}') } catch { console.error('Failed to parse user:', all['user']); return null }
        if (!user?.id) console.error('User ID is missing:', user)
        if (!user?.id) return null

        console.log({user})
        return { user, all }
    }

    private decodeStartParam(raw?: string) {
        if (!raw) return null
        try {
            const s = base64UrlToBuffer(raw).toString('utf8')
            try { return JSON.parse(s) } catch { return { raw: s } }
        } catch { return null }
    }

    async handleTelegramAuth(
        initData: string,
        _opts?: { startParamRaw?: string },
    ) {
        const valid = this.validateInitData(initData)
        if (!valid) throw new UnauthorizedException('invalid initData')

        const tgUserId = String(valid.user.id)
        let siteUserId: string | null = null
        let profileId: string | null = null

        const startPayload = this.decodeStartParam(valid.all['start_param'] || _opts?.startParamRaw)
        if (startPayload && (startPayload.site_id || startPayload.siteId) && (startPayload.user_id || startPayload.userId)) {
            const siteId = String(startPayload.site_id ?? startPayload.siteId)
            siteUserId = String(startPayload.user_id ?? startPayload.userId)
            await withOtelSpan('postgres.upsert_account_link', async () => {
                await db.insert(accountLinks)
                    .values({ telegramUserId: BigInt(tgUserId), siteId, siteUserId })
                    .onConflictDoUpdate({
                        target: [accountLinks.telegramUserId, accountLinks.siteId],
                        set: { siteUserId, updatedAt: new Date() },
                    })
                return undefined
            }, { dep: 'postgres' })

            // Ensure a profiles row exists for this site user and update minimal fields.
            await withOtelSpan('postgres.upsert_profile', async () => {
                await db.insert(profiles).values({
                    userId: siteUserId,
                    playerName: null,
                    mainType: null,
                    mainPsychotype: null,
                    confidence: '0',
                    inventory: JSON.stringify([]),
                    tags: JSON.stringify({}),
                    stats: JSON.stringify({}),
                }).onConflictDoUpdate({
                    target: [profiles.userId],
                    // Do not overwrite existing playerName on conflict — only touch updatedAt (keep prior playerName)
                    set: { updatedAt: new Date() },
                })
                return undefined
            }, { dep: 'postgres' })

            // Load profile to obtain internal UUID (typed)
            const prow = await withOtelSpan('postgres.select_profile_by_user', async () => {
                return db.select().from(profiles).where(eq(profiles.userId, siteUserId!)).limit(1)
            }, { dep: 'postgres' })
            const pRow = prow[0] ?? null
            if (pRow && typeof (pRow as { id?: unknown }).id === 'string') {
                profileId = (pRow as { id?: string }).id as string
            }
        }

        // Keep uId as siteUserId (do not override). Add pid claim with internal profile id if present.
        const token = jwt.sign(
            { uId: siteUserId, pid: profileId ?? null, tgId: tgUserId, tp: 'tg' as const },
            this.jwtSecret,
            { expiresIn: this.jwtTtlSec }
        ) // seconds

        // try to read existing player name from profiles (if any) using typed rows
        let playerName: string | null = null
        try {
            if (profileId) {
                const rows = await withOtelSpan('postgres.select_profile_by_id', async () => {
                    return db.select().from(profiles).where(eq(profiles.id, profileId!)).limit(1)
                }, { dep: 'postgres' })
                const row = rows[0] ?? null
                if (row && typeof (row as { playerName?: unknown }).playerName === 'string') {
                    const pn = (row as { playerName?: string }).playerName
                    if (pn) playerName = pn
                }
            } else if (siteUserId) {
                const rows = await withOtelSpan('postgres.select_profile_by_user', async () => {
                    return db.select().from(profiles).where(eq(profiles.userId, siteUserId!)).limit(1)
                }, { dep: 'postgres' })
                const row = rows[0] ?? null
                if (row && typeof (row as { playerName?: unknown }).playerName === 'string') {
                    const pn = (row as { playerName?: string }).playerName
                    if (pn) playerName = pn
                }
            }
        } catch (err: unknown) {
            playerName = null
        }
        
        return { jwt: token, maxAgeMs: this.jwtTtlSec * 1000, player_name: playerName }
    }

    async findLink(siteId: string, tgUserId: string) {
        const rows = await db.select().from(accountLinks)
            .where(and(eq(accountLinks.siteId, siteId), eq(accountLinks.telegramUserId, BigInt(tgUserId))))
            .limit(1)
        return rows[0] ?? null
    }
}
