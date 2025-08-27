import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { json } from 'express'
import { Telegraf, Context } from 'telegraf'
import { ConfigService } from '@nestjs/config'
import { BotUpdate } from './bot.update'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  const botToken = config.get<string>('BOT_TOKEN')
  const publicBaseUrl = config.get<string>('PUBLIC_BASE_URL')
  const webhookPath = config.get<string>('WEBHOOK_PATH') || '/tgbot/webhook'
  const secret = config.get<string>('TELEGRAM_SECRET_TOKEN')

  if (!botToken) throw new Error('BOT_TOKEN is required')
  if (!publicBaseUrl) throw new Error('PUBLIC_BASE_URL is required for webhook mode')

  // Всегда создаём локальный Telegraf и привязываем обработчики из BotUpdate.
  const botUpdate = app.get(BotUpdate)
  const bot = new Telegraf<Context>(botToken)

  // Регистрируем основные обработчики, использующие методы BotUpdate.
  bot.start(async (ctx) => {
    try { await botUpdate.onStart(ctx) } catch { /* ignore */ }
  })
  bot.action('text_mode', async (ctx) => {
    try { await botUpdate.onTextMode(ctx) } catch { /* ignore */ }
  })
  bot.action(/choice:.+/, async (ctx) => {
    try { await botUpdate.onChoice(ctx) } catch { /* ignore */ }
  })

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
  const info = await bot.telegram.getWebhookInfo()

  console.log(info)

  if (info.url !== fullWebhookUrl) {
    await bot.telegram.setWebhook(fullWebhookUrl, { secret_token: secret })
  }

  // Корректное завершение работы
  // const shutdown = async () => {
  //   try { await bot.telegram.deleteWebhook() } catch {}
  //   process.exit(0)
  // }
  // process.on('SIGTERM', shutdown)
  // process.on('SIGINT', shutdown)

  await app.listen(3000)
  Logger.log(`Webhook set at ${fullWebhookUrl} and listening on port 3000`)
}

bootstrap()
