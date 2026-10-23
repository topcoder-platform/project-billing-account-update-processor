import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { validateEnvironment } from '../../src/config/env.validation.js'

const auth0 = {
  AUTH0_AUDIENCE: 'https://m2m.example.com/',
  AUTH0_CLIENT_ID: 'client-id',
  AUTH0_CLIENT_SECRET: 'client-secret',
  AUTH0_URL: 'https://auth.example.com/oauth/token',
}

describe('validateEnvironment', () => {
  // validateEnvironment merges over process.env; keep "unset" cases deterministic.
  beforeEach(() => {
    delete process.env.USE_KEYCLOAK
  })

  for (const [name, flag] of [
    ['unset', {}],
    ['false', { USE_KEYCLOAK: 'false' }],
  ] as const) {
    it(`requires only the Auth0 settings when USE_KEYCLOAK is ${name}`, () => {
      const environment = validateEnvironment({ ...flag, ...auth0 })

      assert.equal(environment.KAFKA_URL, 'localhost:9092')
      assert.equal(environment.AUTH0_CLIENT_ID, 'client-id')
      assert.throws(
        () => validateEnvironment({ ...flag }),
        /AUTH0_AUDIENCE.*AUTH0_CLIENT_ID.*AUTH0_CLIENT_SECRET.*AUTH0_URL/,
      )
    })
  }

  it('rejects an invalid Auth0 proxy URL like the pre-Keycloak worker', () => {
    assert.throws(
      () => validateEnvironment({ ...auth0, AUTH0_PROXY_SERVER_URL: 'nope' }),
      /AUTH0_PROXY_SERVER_URL/,
    )
  })

  it('rejects USE_KEYCLOAK values other than true or false', () => {
    assert.throws(
      () => validateEnvironment({ ...auth0, USE_KEYCLOAK: 'yes' }),
      /^Error: Configuration validation error: USE_KEYCLOAK must be true or false$/,
    )
  })

  it('applies Kafka defaults when required Keycloak settings are present', () => {
    const environment = validateEnvironment({
      USE_KEYCLOAK: 'true',
      KEYCLOAK_ISSUER: 'https://auth.example.com/realms/m2m',
      KEYCLOAK_AUDIENCE: 'https://m2m.example.com/',
      KEYCLOAK_CLIENT_ID: 'client-id',
      KEYCLOAK_CLIENT_SECRET: 'client-secret',
      KEYCLOAK_TOKEN_URL: 'https://auth.example.com/oauth/token',
    })

    assert.equal(environment.KAFKA_URL, 'localhost:9092')
    assert.equal(environment.KAFKA_FROM_BEGINNING, false)
    assert.equal(environment.KAFKA_HIGH_WATER_MARK, 1)
    assert.equal(environment.KAFKA_RECONNECT_DELAY_MS, 5_000)
    assert.equal(environment.KEYCLOAK_CLIENT_ID, 'client-id')
  })

  it('fails startup validation when Keycloak settings are missing', () => {
    assert.throws(
      () => validateEnvironment({ USE_KEYCLOAK: 'true', ...auth0 }),
      /KEYCLOAK_ISSUER.*KEYCLOAK_AUDIENCE.*KEYCLOAK_TOKEN_URL.*KEYCLOAK_CLIENT_ID.*KEYCLOAK_CLIENT_SECRET/,
    )
  })

  it('reports all invalid environment fields in one error', () => {
    assert.throws(
      () =>
        validateEnvironment({
          USE_KEYCLOAK: 'true',
          KEYCLOAK_ISSUER: 'https://auth.example.com/realms/m2m',
          KEYCLOAK_AUDIENCE: 'https://m2m.example.com/',
          KEYCLOAK_CLIENT_ID: 'client-id',
          KEYCLOAK_CLIENT_SECRET: 'client-secret',
          KEYCLOAK_TOKEN_URL: 'https://auth.example.com/oauth/token',
          CHALLENGE_API_URL: 'not a URL',
          KAFKA_HIGH_WATER_MARK: 'zero',
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /CHALLENGE_API_URL/)
        assert.match(error.message, /KAFKA_HIGH_WATER_MARK/)
        return true
      },
    )
  })
})
