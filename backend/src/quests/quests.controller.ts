import { Controller, Get, Put, Body, HttpCode } from '@nestjs/common';
import { QuestsService } from './quests.service';

@Controller('quests')
export class QuestsController {
  constructor(private readonly service: QuestsService) {}
  @Get() list() { return this.service.list(); }
  @Get('ping') ping() { return { ok: true }; }
  
  @Get('state')
  getQuestState() {
    return this.service.getQuestState();
  }
  
  @Put('choice')
  @HttpCode(200)
  makeChoice(@Body() choiceData: { choiceId: string }) {
    return this.service.processChoice(choiceData.choiceId);
  }
}

@Controller('rewards')
export class RewardsController {
  constructor(private readonly questsService: QuestsService) {}
  
  @Get()
  getRewards() {
    return this.questsService.getRewards();
  }
}
