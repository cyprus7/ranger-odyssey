import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { db } from '../db/drizzle-client'
import { questRewards } from '../db/schema'
import { eq } from 'drizzle-orm'
import type pino from 'pino'

@Injectable()
export class RewardService {
    constructor(private readonly logger: PinoLogger) {
        this.logger.setContext('RewardService')
    }

    async getAllForUser(userId: string, logger?: pino.Logger, trace_id?: string) {
        const rows = await db.select().from(questRewards).where(eq(questRewards.userId, userId))
        return rows.map(r => ({
            day: r.dayNumber,
            bonus_code: r.bonusCode,
            status: r.status,
        }))
    }
}
