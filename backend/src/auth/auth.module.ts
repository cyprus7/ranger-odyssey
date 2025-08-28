import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { ObservabilityLoggingModule } from '../observability/logging.module'

@Module({
    imports: [ObservabilityLoggingModule],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [AuthService],
})
export class AuthModule {}
