import { Module } from '@nestjs/common'
import { RewardsController } from './rewards.controller'
import { RewardService } from './reward.service'
import { ObservabilityLoggingModule } from '../observability/logging.module'

@Module({
    imports: [ObservabilityLoggingModule],
    controllers: [RewardsController],
    providers: [RewardService],
    exports: [RewardService],
})
export class RewardsModule {}
