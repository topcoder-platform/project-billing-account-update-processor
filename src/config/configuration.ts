import type { AppConfig } from './config.types.js'

export const DEFAULT_CHALLENGE_API_URL =
  'https://api.topcoder-dev.com/v6/challenges'
export const DEFAULT_KAFKA_BROKER = 'localhost:9092'
export const DEFAULT_KAFKA_CLIENT_ID =
  'project-billing-account-update-processor'
export const DEFAULT_KAFKA_GROUP_ID = 'project-billing-account-update-processor'
export const DEFAULT_KAFKA_TOPIC = 'project.action.billingAccount.update'
export const DEFAULT_KAFKA_SESSION_TIMEOUT = 60_000
export const DEFAULT_KAFKA_HEARTBEAT_INTERVAL = 3_000
export const DEFAULT_KAFKA_HIGH_WATER_MARK = 1
export const DEFAULT_KAFKA_RECONNECT_DELAY = 5_000

export type EnvironmentSource = Readonly<Record<string, string | undefined>>

function optionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function stringValue(value: string | undefined, fallback: string): string {
  return optionalString(value) ?? fallback
}

function booleanValue(value: string | undefined, fallback = false): boolean {
  const normalized = optionalString(value)?.toLowerCase()
  if (normalized === undefined) return fallback
  return normalized === 'true'
}

function positiveIntegerValue(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function kafkaBrokers(value: string | undefined): string[] {
  const brokers = (value ?? '')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean)

  return brokers.length > 0 ? brokers : [DEFAULT_KAFKA_BROKER]
}

export function createConfiguration(
  environment: EnvironmentSource = process.env,
): AppConfig {
  return {
    logger: {
      disableLogging: booleanValue(environment.DISABLE_LOGGING),
      logLevel: stringValue(environment.LOG_LEVEL, 'debug'),
    },
    kafka: {
      brokers: kafkaBrokers(environment.KAFKA_URL),
      clientId: stringValue(
        environment.KAFKA_CLIENT_ID,
        DEFAULT_KAFKA_CLIENT_ID,
      ),
      groupId: stringValue(environment.KAFKA_GROUP_ID, DEFAULT_KAFKA_GROUP_ID),
      topic: stringValue(environment.KAFKA_TOPIC, DEFAULT_KAFKA_TOPIC),
      fromBeginning: booleanValue(environment.KAFKA_FROM_BEGINNING),
      sessionTimeout: positiveIntegerValue(
        environment.KAFKA_SESSION_TIMEOUT_MS,
        DEFAULT_KAFKA_SESSION_TIMEOUT,
      ),
      heartbeatInterval: positiveIntegerValue(
        environment.KAFKA_HEARTBEAT_INTERVAL_MS,
        DEFAULT_KAFKA_HEARTBEAT_INTERVAL,
      ),
      highWaterMark: positiveIntegerValue(
        environment.KAFKA_HIGH_WATER_MARK,
        DEFAULT_KAFKA_HIGH_WATER_MARK,
      ),
      reconnectDelay: positiveIntegerValue(
        environment.KAFKA_RECONNECT_DELAY_MS,
        DEFAULT_KAFKA_RECONNECT_DELAY,
      ),
      autocreateTopics: booleanValue(environment.KAFKA_AUTOCREATE_TOPICS),
    },
    challengeApiUrl:
      optionalString(environment.CHALLENGE_API_URL) ??
      optionalString(environment.CHALLENGE_API) ??
      DEFAULT_CHALLENGE_API_URL,
    auth: {
      auth0Audience: optionalString(environment.AUTH0_AUDIENCE),
      auth0ClientId: optionalString(environment.AUTH0_CLIENT_ID),
      auth0ClientSecret: optionalString(environment.AUTH0_CLIENT_SECRET),
      auth0Url: optionalString(environment.AUTH0_URL),
      auth0ProxyServerUrl: optionalString(environment.AUTH0_PROXY_SERVER_URL),
    },
  }
}

export default function configuration(): AppConfig {
  return createConfiguration()
}
