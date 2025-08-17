import { Module } from '@nestjs/common'
import { ObservabilityLoggingModule } from '../observability/logging.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
    imports: [ObservabilityLoggingModule],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [AuthService],
})
export class AuthModule {}
