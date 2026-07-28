import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DEFAULT_CHALLENGE_API_URL,
  DEFAULT_KAFKA_BROKER,
  DEFAULT_KAFKA_CLIENT_ID,
  DEFAULT_KAFKA_GROUP_ID,
  DEFAULT_KAFKA_TOPIC,
  createConfiguration,
} from '../../src/config/configuration.js'

describe('createConfiguration', () => {
  it('uses processor-safe defaults', () => {
    const config = createConfiguration({})

    assert.equal(config.challengeApiUrl, DEFAULT_CHALLENGE_API_URL)
    assert.deepEqual(config.kafka.brokers, [DEFAULT_KAFKA_BROKER])
    assert.equal(config.kafka.clientId, DEFAULT_KAFKA_CLIENT_ID)
    assert.equal(config.kafka.groupId, DEFAULT_KAFKA_GROUP_ID)
    assert.equal(config.kafka.topic, DEFAULT_KAFKA_TOPIC)
    assert.equal(config.kafka.fromBeginning, false)
    assert.equal(config.kafka.highWaterMark, 1)
    assert.equal(config.kafka.reconnectDelay, 5_000)
    assert.equal(config.kafka.autocreateTopics, false)
    assert.deepEqual(config.auth, {
      auth0Audience: undefined,
      auth0ClientId: undefined,
      auth0ClientSecret: undefined,
      auth0Url: undefined,
      auth0ProxyServerUrl: undefined,
    })
  })

  it('prefers CHALLENGE_API_URL and supports the legacy CHALLENGE_API alias', () => {
    assert.equal(
      createConfiguration({
        CHALLENGE_API: 'https://legacy.example/challenges',
      }).challengeApiUrl,
      'https://legacy.example/challenges',
    )
    assert.equal(
      createConfiguration({
        CHALLENGE_API_URL: 'https://canonical.example/challenges',
        CHALLENGE_API: 'https://legacy.example/challenges',
      }).challengeApiUrl,
      'https://canonical.example/challenges',
    )
  })

  it('normalizes Kafka and optional Auth0 environment values', () => {
    const config = createConfiguration({
      KAFKA_URL: ' broker-a:9092, ,broker-b:9092 ',
      KAFKA_FROM_BEGINNING: 'true',
      KAFKA_SESSION_TIMEOUT_MS: '45000',
      KAFKA_HEARTBEAT_INTERVAL_MS: '2500',
      KAFKA_HIGH_WATER_MARK: '4',
      KAFKA_RECONNECT_DELAY_MS: '7500',
      KAFKA_AUTOCREATE_TOPICS: 'true',
      AUTH0_CLIENT_ID: ' client-id ',
      AUTH0_CLIENT_SECRET: '',
    })

    assert.deepEqual(config.kafka.brokers, ['broker-a:9092', 'broker-b:9092'])
    assert.equal(config.kafka.fromBeginning, true)
    assert.equal(config.kafka.sessionTimeout, 45_000)
    assert.equal(config.kafka.heartbeatInterval, 2_500)
    assert.equal(config.kafka.highWaterMark, 4)
    assert.equal(config.kafka.reconnectDelay, 7_500)
    assert.equal(config.kafka.autocreateTopics, true)
    assert.equal(config.auth.auth0ClientId, 'client-id')
    assert.equal(config.auth.auth0ClientSecret, undefined)
  })
})
