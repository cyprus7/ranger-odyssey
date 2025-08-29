import { Controller, Get, UseGuards, Req } from '@nestjs/common'
import { RewardService } from './reward.service'
import { PinoLogger } from 'nestjs-pino'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'
import type pino from 'pino'

@Controller('rewards')
export class RewardsController {
    constructor(
        private readonly service: RewardService,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext('RewardsController')
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getRewards(@CurrentUserId() id: string, @Req() req: { logger?: pino.Logger; trace_id?: string }) {
        const rewards = await this.service.getAll(id, req.logger, req.trace_id)
        this.logger.info({ id, rewards }, 'Returned rewards')
        return rewards
    }
}
