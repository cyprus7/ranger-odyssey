import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { getBotToken } from 'nestjs-telegraf'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  const hookPath = config.get<string>('WEBHOOK_PATH') || '/tgbot/webhook'
  const secret   = config.get<string>('TELEGRAM_SECRET_TOKEN')

  // Достаём бота из DI и вешаем middleware на Express
  const bot = app.get(getBotToken())
  app.use(hookPath, (bot as any).webhookCallback(hookPath, { secretToken: secret }))

  await app.listen(process.env.PORT || 3000)
  console.log(`Server is listening on port ${process.env.PORT || 3000}, webhook on ${hookPath}`)
}
bootstrap()