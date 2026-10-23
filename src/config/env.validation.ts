import Joi from 'joi'
import core from 'tc-core-library-js'

/** Settings validated in both M2M provider modes. `USE_KEYCLOAK` is checked by the core. */
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
}).unknown(true)

/** `USE_KEYCLOAK=true`: HTTPS Keycloak issuance settings and this worker's credentials. */
export const keycloakEnvironmentSchema = environmentSchema.keys({
  KEYCLOAK_ISSUER: Joi.string()
    .trim()
    .uri({ scheme: ['https'] })
    .required(),
  KEYCLOAK_AUDIENCE: Joi.string().trim().min(1).required(),
  KEYCLOAK_TOKEN_URL: Joi.string()
    .trim()
    .uri({ scheme: ['https'] })
    .required(),
  KEYCLOAK_CLIENT_ID: Joi.string().trim().min(1).required(),
  KEYCLOAK_CLIENT_SECRET: Joi.string().trim().min(1).required(),
  KEYCLOAK_SCOPE: Joi.string().trim().empty(''),
})

/** `USE_KEYCLOAK` unset or `false`: the Auth0 settings required before the migration. */
export const auth0EnvironmentSchema = environmentSchema.keys({
  AUTH0_AUDIENCE: Joi.string().trim().min(1).required(),
  AUTH0_CLIENT_ID: Joi.string().trim().min(1).required(),
  AUTH0_CLIENT_SECRET: Joi.string().trim().min(1).required(),
  AUTH0_URL: Joi.string().trim().uri().required(),
  AUTH0_PROXY_SERVER_URL: Joi.string().trim().uri().empty(''),
})

/** Validate startup configuration for the M2M provider selected by `USE_KEYCLOAK`.
 * `tc-core-library-js` `auth.useKeycloak` makes the decision (values merge over
 * process.env). `true` requires HTTPS Keycloak issuance and credentials
 * (`keycloakEnvironmentSchema`); unset or `false` requires the Auth0 settings
 * (`auth0EnvironmentSchema`). Used as the Nest `ConfigModule` validator by the worker
 * and the development challenge script.
 * @param environment Untrusted environment settings loaded by Nest.
 * @returns Validated settings with Kafka defaults.
 * @throws Error listing invalid configuration fields, or an invalid `USE_KEYCLOAK`
 * value; no credentials are included.
 */
export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  let keycloak: boolean
  try {
    keycloak = core.auth.useKeycloak(environment)
  } catch (error) {
    throw new Error(
      `Configuration validation error: ${(error as Error).message}`,
      { cause: error },
    )
  }
  const schema = keycloak ? keycloakEnvironmentSchema : auth0EnvironmentSchema
  const { error, value } = schema.validate(environment, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
  })

  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`)
  }

  return value as Record<string, unknown>
}
