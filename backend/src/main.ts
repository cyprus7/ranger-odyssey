import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = 3001;
  const origin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: origin === '*' ? true : origin.split(',').map(s => s.trim()),
    credentials: true
  });
  app.setGlobalPrefix('api');
  await app.listen(port);
  console.log(`Backend listening on :${port}`);
}
bootstrap();
