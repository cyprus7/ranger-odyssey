import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { TraceContextInterceptor } from './observability/trace-context.interceptor';
import { ObservabilityLoggingModule } from './observability/logging.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  // Use global logger from nestjs-pino (provided by ObservabilityLoggingModule)
  app.useLogger(app.get(Logger));

  // Apply the trace context interceptor globally
  app.useGlobalInterceptors(new TraceContextInterceptor(app.get(Logger)));

  // Enable CORS and set global prefix as before
  const port = 3001;
  const origin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: origin === '*' ? true : origin.split(',').map(s => s.trim()),
    credentials: true
  });
  app.setGlobalPrefix('api');
  await app.listen(port);

  // Cast Logger to PinoLogger to use the `info` method
  const logger = app.get(Logger) as PinoLogger;
  logger.info(`Backend listening on :${port}`);
}
bootstrap();
