import { Controller, Get, Put, Body, HttpCode, UseGuards, Param, Post } from '@nestjs/common'
import { QuestsService } from './quests.service'
import { PinoLogger } from 'nestjs-pino'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'
import { RewardService } from './reward.service'

@Controller('quests')
export class QuestsController {
    constructor(
    private readonly service: QuestsService,
    private readonly logger: PinoLogger
    ) {
        this.logger.setContext('QuestsController')
    }
  @Get() async list() {
        return this.service.list()
    }
  @Get('ping') ping() { 
      return { ok: true } 
  }

  @Get('state')
  @UseGuards(JwtAuthGuard)
  getQuestState(@CurrentUserId() userId: string) {
      const state = this.service.getQuestState(userId)
      this.logger.info({ state }, 'Returned quest state')
      return state
  }

  @Put('choice')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  makeChoice(@CurrentUserId() userId: string, @Body() choiceData: { choiceId: string; day?: string }) {
      const day = choiceData.day ?? 'day1'
      this.logger.info({ day, choiceId: choiceData.choiceId }, 'Processing quest choice')
      const result = this.service.processChoice(userId, day, choiceData.choiceId)
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
