import Joi from 'joi'

export const environmentSchema = Joi.object({
  DISABLE_LOGGING: Joi.boolean().truthy('true').falsy('false').default(false),
  LOG_LEVEL: Joi.string()
    .trim()
    .lowercase()
    .valid('fatal', 'error', 'warn', 'log', 'info', 'debug', 'verbose')
    .default('debug'),
  KAFKA_URL: Joi.string().trim().min(1).default('localhost:9092'),
  KAFKA_CLIENT_ID: Joi.string()
    .trim()
    .min(1)
    .default('project-billing-account-update-processor'),
  KAFKA_GROUP_ID: Joi.string()
    .trim()
    .min(1)
    .default('project-billing-account-update-processor'),
  KAFKA_TOPIC: Joi.string()
    .trim()
    .min(1)
    .default('project.action.billingAccount.update'),
  KAFKA_FROM_BEGINNING: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  KAFKA_SESSION_TIMEOUT_MS: Joi.number().integer().positive().default(60_000),
  KAFKA_HEARTBEAT_INTERVAL_MS: Joi.number().integer().positive().default(3_000),
  KAFKA_HIGH_WATER_MARK: Joi.number().integer().positive().default(1),
  KAFKA_RECONNECT_DELAY_MS: Joi.number().integer().positive().default(5_000),
  KAFKA_AUTOCREATE_TOPICS: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  CHALLENGE_API_URL: Joi.string().trim().uri().empty(''),
  CHALLENGE_API: Joi.string().trim().uri().empty(''),
  AUTH0_AUDIENCE: Joi.string().trim().min(1).required(),
  AUTH0_CLIENT_ID: Joi.string().trim().min(1).required(),
  AUTH0_CLIENT_SECRET: Joi.string().trim().min(1).required(),
  AUTH0_URL: Joi.string().trim().uri().required(),
  AUTH0_PROXY_SERVER_URL: Joi.string().trim().uri().empty(''),
}).unknown(true)

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const { error, value } = environmentSchema.validate(environment, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
  })

  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`)
  }

  return value as Record<string, unknown>
}
