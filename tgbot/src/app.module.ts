import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TelegrafModule } from 'nestjs-telegraf'
import { HttpModule } from '@nestjs/axios'
import { BotUpdate } from './bot.update'
import { ApiService } from './services/api.service'
import { JwtService } from './services/jwt.service'
import { HealthController } from './health.controller'
import { I18nService } from './i18n/i18n.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Do not auto-launch the bot (no polling). TelegrafModule still creates the bot
    // and wires @Update() classes, but will not call bot.launch() itself.
    TelegrafModule.forRootAsync({
      useFactory: () => {
        const token = process.env.BOT_TOKEN || ''
        if (!token) {
          throw new Error('Bot Token is required')
        }
        return {
          token,
          launchOptions: {
            webhook: {
              domain: process.env.PUBLIC_BASE_URL || undefined,
              hookPath: process.env.WEBHOOK_PATH || '/tgbot/webhook',
              secretToken: process.env.TELEGRAM_SECRET_TOKEN || undefined,
            },
          },
        }
      },
    }),
    HttpModule,
  ],
  controllers: [HealthController],
  providers: [BotUpdate, ApiService, JwtService, I18nService],
})
export class AppModule {}
