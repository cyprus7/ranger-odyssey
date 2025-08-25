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
    // Do not auto-launch the bot (no polling). TelegrafModule still creates the bot
    // and wires @Update() classes, but will not call bot.launch() itself.
    TelegrafModule.forRootAsync({
      useFactory: () => ({ token: process.env.BOT_TOKEN || '', launch: false }),
    }),
    HttpModule,
  ],
  controllers: [HealthController],
  providers: [BotUpdate, ApiService, JwtService],
})
export class AppModule {}
