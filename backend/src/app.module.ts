import { Module, MiddlewareConsumer } from '@nestjs/common'
import { QuestsModule } from './quests/quests.module'
import { HealthController } from './health.controller'
import { ObservabilityLoggingModule } from './observability/logging.module'
import { RequestLoggerAliasMiddleware } from './observability/request-logger-alias.middleware'

@Module({
    imports: [ObservabilityLoggingModule, QuestsModule],
    controllers: [HealthController],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggerAliasMiddleware).forRoutes('*')
    }
}
