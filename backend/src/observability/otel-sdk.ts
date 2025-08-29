import { IncomingMessage } from 'http'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'

// --- Exporters ---
const traceExporter = new OTLPTraceExporter({
    // env OTEL_EXPORTER_OTLP_ENDPOINT
    // url: 'http://otel-collector:4318/v1/traces',
})

const metricReader =
  process.env.OTEL_METRICS_EXPORTER === 'prometheus'
      ? new PrometheusExporter({
          port: Number(process.env.OTEL_PROM_PORT) || 9464,
          endpoint: process.env.OTEL_PROM_ENDPOINT || '/metrics',
      })
      : new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
          // url: 'http://otel-collector:4318/v1/metrics',
          }),
          exportIntervalMillis: 15_000,
      })

// --- NodeSDK (ветка 0.203.x использует metricReader, не metrics:{...}) ---
const sdk = new NodeSDK({
    traceExporter,
    metricReader,
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': {
                ignoreIncomingRequestHook: (req: IncomingMessage) =>
                    req.url === '/health' || req.url === '/metrics',
            },
            '@opentelemetry/instrumentation-express': { enabled: true },
            '@opentelemetry/instrumentation-pg': { enabled: true },
        }),
    ],
})

sdk.start()

process.on('SIGTERM', () => void sdk.shutdown())
process.on('SIGINT', () => void sdk.shutdown())
