import { Controller, Get } from '@nestjs/common';
import { QuestsService } from './quests.service';

@Controller('quests')
export class QuestsController {
  constructor(private readonly service: QuestsService) {}
  @Get() list() { return this.service.list(); }
  @Get('ping') ping() { return { ok: true }; }
}
