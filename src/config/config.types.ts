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

export interface AuthConfig {
  auth0Audience?: string
  auth0ClientId?: string
  auth0ClientSecret?: string
  auth0Url?: string
  auth0ProxyServerUrl?: string
}

export interface AppConfig {
  logger: LoggerConfig
  kafka: KafkaConfig
  challengeApiUrl: string
  auth: AuthConfig
}
