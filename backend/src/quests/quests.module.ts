import { Module } from '@nestjs/common'
import { QuestsController, RewardsController } from './quests.controller'
import { QuestsService } from './quests.service'
import { ObservabilityLoggingModule } from '../observability/logging.module'

@Module({
    imports: [ObservabilityLoggingModule],
    controllers: [QuestsController, RewardsController],
    providers: [QuestsService],
})
export class QuestsModule {}
