import { Controller, Get, Put, Body, UseGuards, BadRequestException, Req } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'
import { CurrentProfileId } from '../auth/current-profileid.decorator'
import { db } from '../db/drizzle-client'
import { profiles } from '../db/schema'
import { eq } from 'drizzle-orm'
import type pino from 'pino'

@Controller('profile')
export class ProfileController {
    constructor(
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext('ProfileController')
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getProfile(@CurrentUserId() id: string, @CurrentProfileId() pid: string | null, @Req() req: { logger?: pino.Logger; trace_id?: string }) {
        const profilesResult = await db.select().from(profiles).where(eq(profiles.userId, id)).limit(1)
        const row = profilesResult[0]
        if (!row) {
            return null
        }

        // normalize types: parse JSON fields (inventory, tags, stats) if needed
        let inventory: unknown = []
        let tags: unknown = {}
        let stats: unknown = {}
        // eslint-disable-next-line no-empty
        try { inventory = typeof row.inventory === 'string' ? JSON.parse(row.inventory) : row.inventory ?? [] } catch {}
        // eslint-disable-next-line no-empty
        try { tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags ?? {} } catch {}
        // eslint-disable-next-line no-empty
        try { stats = typeof row.stats === 'string' ? JSON.parse(row.stats) : row.stats ?? {} } catch {}

        const profile = {
            tags,
            main_type: row.mainType ?? null,
            main_psychotype: row.mainPsychotype ?? null,
            confidence: Number(row.confidence ?? 0),
            inventory,
            stats,
            lang: row.lang ?? null,
        }
        this.logger.info({ id, profile }, 'Returned profile')
        return profile
    }

    @Put()
    @UseGuards(JwtAuthGuard)
    async updateProfile(@CurrentProfileId() id: string | null, @Body() body: { player_name?: string; lang?: string }) {
        const playerName = body?.player_name ?? null
        const lang = body?.lang ?? null
        this.logger.info({ id, playerName, lang }, 'Updating profile player_name and lang')
        if (!id) {
            this.logger.warn('Profile id is missing in token/cookie (updateProfile)')
            throw new BadRequestException('profile id is missing')
        }
        const isUuid = typeof id === 'string' && /^[0-9a-fA-F-]{36}$/.test(id)
        if (isUuid) {
            // update by internal id
            await db
                .update(profiles)
                .set({ playerName, lang, updatedAt: new Date() })
                .where(eq(profiles.id, id))
        } else {
            // upsert by userId
            await db.insert(profiles).values({
                userId: id,
                playerName,
                lang,
                mainType: null,
                mainPsychotype: null,
                confidence: '0',
                inventory: JSON.stringify([]),
                tags: JSON.stringify({}),
                stats: JSON.stringify({}),
            }).onConflictDoUpdate({
                target: [profiles.userId],
                set: { playerName, lang, updatedAt: new Date() },
            })
        }
        return { ok: true, player_name: playerName, lang: lang }
    }
}
