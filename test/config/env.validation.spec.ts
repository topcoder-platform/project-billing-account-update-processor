import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { validateEnvironment } from '../../src/config/env.validation.js'

describe('validateEnvironment', () => {
  it('applies Kafka defaults when required Keycloak settings are present', () => {
    const environment = validateEnvironment({
      M2M_PROVIDER: 'keycloak',
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
      () => validateEnvironment({}),
      /M2M_PROVIDER.*KEYCLOAK_ISSUER.*KEYCLOAK_AUDIENCE.*KEYCLOAK_TOKEN_URL.*KEYCLOAK_CLIENT_ID.*KEYCLOAK_CLIENT_SECRET/,
    )
  })

  it('reports all invalid environment fields in one error', () => {
    assert.throws(
      () =>
        validateEnvironment({
          M2M_PROVIDER: 'keycloak',
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
