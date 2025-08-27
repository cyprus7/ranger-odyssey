import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(process.env.PORT || 3000)
  // Логируем запуск сервера
  console.log(`Server is listening on port ${process.env.PORT || 3000}`)
}

bootstrap()
