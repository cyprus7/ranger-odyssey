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

    async getAll(userId: string, logger?: pino.Logger, trace_id?: string) {
        // Stub implementation: return empty array or fetch from DB
        logger?.info({ userId, trace_id }, 'Fetching rewards for user')
        return [] // Replace with actual logic
    }
}
