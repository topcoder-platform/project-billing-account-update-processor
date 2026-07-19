import 'reflect-metadata'

import { type LogLevel } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module.js'

const LOG_LEVELS: Record<string, LogLevel[]> = {
  fatal: ['fatal'],
  error: ['fatal', 'error'],
  warn: ['fatal', 'error', 'warn'],
  log: ['fatal', 'error', 'warn', 'log'],
  info: ['fatal', 'error', 'warn', 'log'],
  debug: ['fatal', 'error', 'warn', 'log', 'debug'],
  verbose: ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'],
}
const DEFAULT_LOG_LEVELS: LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
]

function configuredLogLevels(): false | LogLevel[] {
  if (process.env.DISABLE_LOGGING?.toLowerCase() === 'true') return false

  const configuredLevel = process.env.LOG_LEVEL?.toLowerCase() ?? 'debug'
  return LOG_LEVELS[configuredLevel] ?? DEFAULT_LOG_LEVELS
}

async function bootstrap(): Promise<void> {
  const application = await NestFactory.createApplicationContext(AppModule, {
    logger: configuredLogLevels(),
  })
  application.enableShutdownHooks()
}

bootstrap().catch((error: unknown) => {
  console.error('Application bootstrap failed', error)
  process.exitCode = 1
})
