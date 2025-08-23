import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TelegrafModule } from 'nestjs-telegraf'
import { HttpModule } from '@nestjs/axios'
import { BotUpdate } from './bot.update'
import { ApiService } from './services/api.service'
import { JwtService } from './services/jwt.service'
import { HealthController } from './health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TelegrafModule.forRootAsync({
      useFactory: () => ({ token: process.env.BOT_TOKEN || '' })
    }),
    HttpModule,
  ],
  controllers: [HealthController],
  providers: [BotUpdate, ApiService, JwtService],
})
export class AppModule {}
