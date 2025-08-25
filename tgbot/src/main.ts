import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { json } from 'express'
import { Telegraf } from 'telegraf'
import { ConfigService } from '@nestjs/config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  const botToken = config.get<string>('BOT_TOKEN')
  const publicBaseUrl = config.get<string>('PUBLIC_BASE_URL')
  const webhookPath = config.get<string>('WEBHOOK_PATH') || '/tgbot/webhook'
  const secret = config.get<string>('TELEGRAM_SECRET_TOKEN')

  if (!botToken) throw new Error('BOT_TOKEN is required')
  if (!publicBaseUrl) throw new Error('PUBLIC_BASE_URL is required for webhook mode')

  // Получаем бот, созданный TelegrafModule. TelegrafModule was configured with launch: false,
  // so it won't start polling; we reuse its bot instance to set webhook and handle updates.
  const bot = app.get(Telegraf) as Telegraf

  // Регистрируем общий callback для Nest (без polling)
  const expressApp = app.getHttpAdapter().getInstance()
  expressApp.use(webhookPath, json(), (req, res) => {
    if (secret && req.get('x-telegram-bot-api-secret-token') !== secret) {
      return res.sendStatus(401)
    }
    bot.handleUpdate(req.body, res)
  })

  // Устанавливаем webhook в Telegram
  const fullWebhookUrl = `${publicBaseUrl}${webhookPath}`
  await bot.telegram.setWebhook(fullWebhookUrl, { secret_token: secret })

  // Корректное завершение работы
  const shutdown = async () => {
    try { await bot.telegram.deleteWebhook() } catch {}
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  await app.listen(3000)
  Logger.log(`Webhook set at ${fullWebhookUrl} and listening on port 3000`)
}

bootstrap()
