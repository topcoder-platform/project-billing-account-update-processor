export interface LoggerConfig {
  disableLogging: boolean
  logLevel: string
}

export interface KafkaConfig {
  brokers: string[]
  clientId: string
  groupId: string
  topic: string
  fromBeginning: boolean
  sessionTimeout: number
  heartbeatInterval: number
  highWaterMark: number
  reconnectDelay: number
  autocreateTopics: boolean
}

/** Explicit shared-core Keycloak configuration; legacy Auth0 settings are ignored. */
export interface AuthConfig {
  [setting: string]: unknown
  M2M_PROVIDER?: string
  KEYCLOAK_ISSUER?: string
  KEYCLOAK_AUDIENCE?: string
  KEYCLOAK_TOKEN_URL?: string
  KEYCLOAK_CLIENT_ID?: string
  KEYCLOAK_CLIENT_SECRET?: string
  KEYCLOAK_SCOPE?: string
}

export interface AppConfig {
  logger: LoggerConfig
  kafka: KafkaConfig
  challengeApiUrl: string
  auth: AuthConfig
}
