import { Module } from '@nestjs/common'
import { QuestsController, RewardsController } from './quests.controller'
import { QuestsService } from './quests.service'
import { ObservabilityLoggingModule } from '../observability/logging.module'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { PostgresQuestProgressStore } from './store.pg'
import { RewardService } from './reward.service'
import type { QuestProgressStore } from './progress-store.interface'

@Module({
    imports: [ObservabilityLoggingModule],
    controllers: [QuestsController, RewardsController],
    providers: [
        QuestsService,
        RewardService,
        JwtAuthGuard,
      {
          provide: 'QuestProgressStore',
          useClass: PostgresQuestProgressStore
      } as { provide: string; useClass: new (...args: unknown[]) => QuestProgressStore },
    ],
})
export class QuestsModule {}
