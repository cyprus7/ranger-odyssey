import { Module } from '@nestjs/common'
import { QuestsController } from './quests.controller'
import { QuestsService } from './quests.service'
import { ObservabilityLoggingModule } from '../observability/logging.module'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { PostgresQuestProgressStore } from './store.pg'
import { RewardsModule } from '../rewards/rewards.module'
import type { QuestProgressStore } from './progress-store.interface'

@Module({
    imports: [ObservabilityLoggingModule, RewardsModule],
    controllers: [QuestsController],
    providers: [
        QuestsService,
        JwtAuthGuard,
        {
            provide: 'QuestProgressStore',
            useClass: PostgresQuestProgressStore
        } as { provide: string; useClass: new (...args: unknown[]) => QuestProgressStore },
    ],
})

export class QuestsModule {}
