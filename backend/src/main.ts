import './observability/otel-sdk'  // <- до NestFactory
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from 'nestjs-pino'
import { TraceContextInterceptor } from './observability/trace-context.interceptor'
import { MetricsInterceptor } from './observability/metrics.interceptor'

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    })
    // Use global logger from nestjs-pino (provided by ObservabilityLoggingModule)
    app.useLogger(app.get(Logger))

    // Apply the trace context interceptor globally (simplified, as OTel handles context)
    app.useGlobalInterceptors(new TraceContextInterceptor())
    // Add metrics interceptor
    app.useGlobalInterceptors(new MetricsInterceptor())

    // Enable CORS and set global prefix as before
    const port = 3001
    const origin = process.env.CORS_ORIGIN || '*'
    app.enableCors({
        origin: origin === '*' ? true : origin.split(',').map(s => s.trim()),
        credentials: true,
    })
    app.setGlobalPrefix('api')
    await app.listen(port)

    // Use the `log` method for logging
    const logger = app.get(Logger)
    logger.log(`Backend listening on :${port}`)
}

bootstrap()
