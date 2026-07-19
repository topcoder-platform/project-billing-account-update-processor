import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { validateEnvironment } from '../../src/config/env.validation.js'

describe('validateEnvironment', () => {
  it('applies Kafka defaults when required Auth0 settings are present', () => {
    const environment = validateEnvironment({
      AUTH0_AUDIENCE: 'https://m2m.example.com/',
      AUTH0_CLIENT_ID: 'client-id',
      AUTH0_CLIENT_SECRET: 'client-secret',
      AUTH0_URL: 'https://auth.example.com/oauth/token',
    })

    assert.equal(environment.KAFKA_URL, 'localhost:9092')
    assert.equal(environment.KAFKA_FROM_BEGINNING, false)
    assert.equal(environment.KAFKA_HIGH_WATER_MARK, 1)
    assert.equal(environment.KAFKA_RECONNECT_DELAY_MS, 5_000)
    assert.equal(environment.AUTH0_CLIENT_ID, 'client-id')
  })

  it('fails startup validation when Auth0 settings are missing', () => {
    assert.throws(
      () => validateEnvironment({}),
      /AUTH0_AUDIENCE.*AUTH0_CLIENT_ID.*AUTH0_CLIENT_SECRET.*AUTH0_URL/,
    )
  })

  it('reports all invalid environment fields in one error', () => {
    assert.throws(
      () =>
        validateEnvironment({
          AUTH0_AUDIENCE: 'https://m2m.example.com/',
          AUTH0_CLIENT_ID: 'client-id',
          AUTH0_CLIENT_SECRET: 'client-secret',
          AUTH0_URL: 'https://auth.example.com/oauth/token',
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
