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

/**
 * Options passed to `tc-core-library-js` `auth.m2m` for Challenge API tokens.
 * `USE_KEYCLOAK=true` makes the core use the `KEYCLOAK_*` settings; unset or `false`
 * makes it use the `AUTH0_*` settings, as before the Keycloak migration. Each
 * provider ignores the other's settings.
 */
export interface AuthConfig {
  [setting: string]: unknown
  USE_KEYCLOAK?: string
  AUTH0_URL?: string
  AUTH0_AUDIENCE?: string
  AUTH0_CLIENT_ID?: string
  AUTH0_CLIENT_SECRET?: string
  AUTH0_PROXY_SERVER_URL?: string
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
