import { Module } from '@nestjs/common';
import { QuestsController, RewardsController } from './quests.controller';
import { QuestsService } from './quests.service';

@Module({
  controllers: [QuestsController, RewardsController],
  providers: [QuestsService],
})
export class QuestsModule {}
