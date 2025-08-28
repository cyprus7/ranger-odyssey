import { Controller, Get, Put, Body, HttpCode, UseGuards, Post, Req } from '@nestjs/common'
import { QuestsService } from './quests.service'
import { PinoLogger } from 'nestjs-pino'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'
import type pino from 'pino'

@Controller('quests')
export class QuestsController {
    constructor(
        private readonly service: QuestsService,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext('QuestsController')
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async list(@CurrentUserId() id: string, @Req() req: { logger?: pino.Logger; trace_id?: string }) {
        const quests = await this.service.list(id, req.logger, req.trace_id)
        this.logger.info({ id, quests }, 'Returned quests list')
        return quests
    }

    @Get('state')
    @UseGuards(JwtAuthGuard)
    async getQuestState(@CurrentUserId() id: string, @Req() req: { logger?: pino.Logger; trace_id?: string }) {
        const state = await this.service.getQuestState(id, req.logger, req.trace_id)
        this.logger.info({ id, state }, 'Returned quest state')
        return state
    }

    @Put('choice')
    @HttpCode(200)
    @UseGuards(JwtAuthGuard)
    async makeChoice(@CurrentUserId() id: string, @Body() choiceData: { choiceId: string; day?: string }, @Req() req: { logger?: pino.Logger; trace_id?: string }) {
        this.logger.info({ id, choiceId: choiceData.choiceId }, 'Processing quest choice')
        const result = await this.service.processChoice(id, choiceData.choiceId, req.logger, req.trace_id)
        this.logger.info({ id, result }, 'Quest choice processed')
        return result
    }

    @Post('reset')
    @UseGuards(JwtAuthGuard)
    async resetQuest(@CurrentUserId() id: string, @Req() req: { logger?: pino.Logger; trace_id?: string }) {
        const result = await this.service.resetQuest(id, req.logger, req.trace_id)
        this.logger.info({ id, result }, 'Quest reset')
        return result
    }
}
