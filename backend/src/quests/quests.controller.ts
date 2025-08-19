import { Controller, Get, Put, Body, HttpCode, UseGuards, Param, Post } from '@nestjs/common'
import { QuestsService } from './quests.service'
import { PinoLogger } from 'nestjs-pino'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'
import { RewardService } from './reward.service'
import { db } from '../db/drizzle-client'
import { profiles } from '../db/schema'
import { eq } from 'drizzle-orm'

@Controller('quests')
export class QuestsController {
    constructor(
    private readonly service: QuestsService,
    private readonly logger: PinoLogger
    ) {
        this.logger.setContext('QuestsController')
    }
  @Get()
  @UseGuards(JwtAuthGuard)
    async list(@CurrentUserId() userId: string) {
        const result = await this.service.list(userId)
        this.logger.info({ result }, 'Returned quests list')
        return result
    }

  @Get('ping')
  ping() {
      return { ok: true }
  }

  @Get('state')
  @UseGuards(JwtAuthGuard)
  async getQuestState(@CurrentUserId() userId: string) {
      const state = await this.service.getQuestState(userId)
      this.logger.info({ state }, 'Returned quest state')
      return state
  }

  @Put('choice')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async makeChoice(@CurrentUserId() userId: string, @Body() choiceData: { choiceId: string; day?: string }) {
      this.logger.info({ choiceId: choiceData.choiceId }, 'Processing quest choice')
      const result = await this.service.processChoice(userId, choiceData.choiceId)
      this.logger.info({ result }, 'Quest choice processed')
      return result
  }
}

@Controller('rewards')
export class RewardsController {
    constructor(
    private readonly questsService: QuestsService,
    private readonly rewards: RewardService,
    private readonly logger: PinoLogger
    ) {
        this.logger.setContext('RewardsController')
    }

  @Get()
  @UseGuards(JwtAuthGuard)
    getRewards(@CurrentUserId() userId: string) {
        const rewards = this.questsService.getRewards(userId)
        this.logger.info({ rewards }, 'Returned rewards')
        return rewards
    }

  // Переход статуса: accrued -> issuing -> claimed (здесь — сразу до claimed, как заглушка)
  @Post(':day/claim')
  @UseGuards(JwtAuthGuard)
  async claim(@CurrentUserId() userId: string, @Param('day') day: string) {
      const dayNumber = Number(String(day).match(/\d+/)?.[0] ?? 1)
      // идемпотентно: выставляем claimed
      await this.rewards.setStatus(userId, dayNumber, 'claimed')
      return { ok: true, day: dayNumber, status: 'claimed' }
  }
}

// New controller: profile
@Controller('profile')
export class ProfileController {
    constructor(private readonly logger: PinoLogger) {
        this.logger.setContext('ProfileController')
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getProfile(@CurrentUserId() userId: string) {
        this.logger.info({ userId }, 'Fetching profile')
        const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
        const row = rows[0] ?? null

        if (!row) {
            // insert defaults (empty inventory and tags)
            await db.insert(profiles).values({
                userId,
                mainType: null,
                mainPsychotype: null,
                confidence: '0',
                inventory: JSON.stringify([]),
                tags: JSON.stringify({}),
                stats: JSON.stringify({}),
            }).onConflictDoNothing()
            // return default shape
            const defaultProfile = {
                tags: {},
                main_type: null,
                main_psychotype: null,
                confidence: 0,
                inventory: [],
                stats: {},
            }
            this.logger.info({ userId }, 'Profile initialized (defaults)')
            return defaultProfile
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

        return {
            tags,
            main_type: row.mainType ?? null,
            main_psychotype: row.mainPsychotype ?? null,
            confidence: Number(row.confidence ?? 0),
            inventory,
            stats,
        }
    }
}
