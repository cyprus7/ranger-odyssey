import { Controller, Get, Put, Body, HttpCode } from '@nestjs/common';
import { QuestsService } from './quests.service';
import { PinoLogger } from 'nestjs-pino';

@Controller('quests')
export class QuestsController {
  constructor(
    private readonly service: QuestsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('QuestsController');
  }
  @Get() list() {
    return this.service.list();
  }
  @Get('ping') ping() { 
    return { ok: true }; 
  }

  @Get('state')
  getQuestState() {
    const state = this.service.getQuestState();
    this.logger.info({ state }, 'Returned quest state');
    return state;
  }

  @Put('choice')
  @HttpCode(200)
  makeChoice(@Body() choiceData: { choiceId: string }) {
    this.logger.info({ choiceId: choiceData.choiceId }, 'Processing quest choice');
    const result = this.service.processChoice(choiceData.choiceId);
    this.logger.info({ result }, 'Quest choice processed');
    return result;
  }
}

@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly questsService: QuestsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('RewardsController');
  }

  @Get()
  getRewards() {
    const rewards = this.questsService.getRewards();
    this.logger.info({ rewards }, 'Returned rewards');
    return rewards;
  }
}
