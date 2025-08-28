import { Module } from '@nestjs/common'
import { ProfileController } from './profile.controller'
import { ObservabilityLoggingModule } from '../observability/logging.module'

@Module({
    imports: [ObservabilityLoggingModule],
    controllers: [ProfileController],
})
export class ProfileModule {}
