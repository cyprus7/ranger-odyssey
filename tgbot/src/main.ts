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

  // Попытка получить бот, созданный TelegrafModule.
  let bot: Telegraf<Context> | null = null
  try {
    bot = app.get(Telegraf) as Telegraf<Context>
  } catch {
    bot = null
  }

  // Если провайдера нет — создаём Telegraf вручную и привязываем обработчики
  if (!bot) {
    const botUpdate = app.get(BotUpdate)
    const localBot = new Telegraf<Context>(botToken)

    // Регистрируем основные обработчики, использующие методы BotUpdate.
    // Это минимальный набор: start и callback actions (text_mode, choice:...).
    localBot.start(async (ctx) => {
      try { await botUpdate.onStart(ctx) } catch { /* ignore */ }
    })
    localBot.action('text_mode', async (ctx) => {
      try { await botUpdate.onTextMode(ctx) } catch { /* ignore */ }
    })
    localBot.action(/choice:.+/, async (ctx) => {
      try { await botUpdate.onChoice(ctx) } catch { /* ignore */ }
    })

    bot = localBot
  }

  // Регистрируем общий callback для Nest (без polling)
  const expressApp = app.getHttpAdapter().getInstance()
  expressApp.use(webhookPath, json(), (req, res) => {
    if (secret && req.get('x-telegram-bot-api-secret-token') !== secret) {
      return res.sendStatus(401)
    }
    bot!.handleUpdate(req.body, res)
  })

  // Устанавливаем webhook в Telegram
  const fullWebhookUrl = `${publicBaseUrl}${webhookPath}`
  await bot.telegram.setWebhook(fullWebhookUrl, { secret_token: secret })

  // Корректное завершение работы
  const shutdown = async () => {
    try { await bot!.telegram.deleteWebhook() } catch {}
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  await app.listen(3000)
  Logger.log(`Webhook set at ${fullWebhookUrl} and listening on port 3000`)
}

bootstrap()
