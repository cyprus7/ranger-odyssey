import { Module } from '@nestjs/common'
import { QuestsModule } from './quests/quests.module'
import { HealthController } from './health.controller'

@Module({
    imports: [QuestsModule],
    controllers: [HealthController],
})
export class AppModule {}
