import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import nock from 'nock'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, it } from 'node:test'

import type { ConfigService } from '@nestjs/config'

import { ChallengeApiService } from '../../src/challenge-api/challenge-api.service.js'
import type { AppConfig } from '../../src/config/config.types.js'

interface ReceivedRequest {
  method?: string
  url?: string
  authorization?: string
  body?: unknown
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve((server.address() as AddressInfo).port)
    })
  })
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

const issuer = 'https://keycloak.billing-test.example/realms/m2m'
const clientId = 'billing-worker'
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
})
const jwk = {
  ...publicKey.export({ format: 'jwk' }),
  kid: 'test',
  alg: 'RS256',
  use: 'sig',
}
const auth = {
  M2M_PROVIDER: 'keycloak',
  KEYCLOAK_ISSUER: issuer,
  KEYCLOAK_AUDIENCE: 'https://api.test.example',
  KEYCLOAK_TOKEN_URL: 'https://keycloak.billing-test.example/m2m/token',
  KEYCLOAK_CLIENT_ID: clientId,
  KEYCLOAK_CLIENT_SECRET: 'synthetic-secret',
  KEYCLOAK_SCOPE: 'read:challenges update:challenges',
}

/** Sign a synthetic service fixture with optional claim changes; returns JWT text. */
function machineToken(overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', kid: 'test' }),
  ).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      iss: issuer,
      aud: auth.KEYCLOAK_AUDIENCE,
      sub: 'service-account-billing',
      azp: clientId,
      gty: 'client-credentials',
      iat: now,
      exp: now + 900,
      scope: auth.KEYCLOAK_SCOPE,
      ...overrides,
    }),
  ).toString('base64url')
  const input = `${header}.${payload}`
  return `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`
}

/** Mock the HTTPS managed issuer and trusted JWKS endpoint; returns required mocks. */
function mockIssuer(token: string) {
  const endpoint = nock('https://keycloak.billing-test.example')
    .post(
      '/m2m/token',
      (body) =>
        body.client_id === clientId && body.grant_type === 'client_credentials',
    )
    .reply(200, { access_token: token, expires_in: 900 })
  nock(issuer)
    .get('/protocol/openid-connect/certs')
    .reply(200, { keys: [jwk] })
  return endpoint
}

describe('ChallengeApiService', () => {
  it('fetches and caches M2M auth before sending a JSON PATCH', async () => {
    const received: ReceivedRequest = {}
    const token = machineToken()
    const endpoint = mockIssuer(token)

    const server = createServer((request, response) => {
      const chunks: Buffer[] = []
      request.on('data', (chunk: Buffer) => chunks.push(chunk))
      request.on('end', () => {
        received.method = request.method
        received.url = request.url
        received.authorization = request.headers.authorization
        received.body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        response.writeHead(200, {
          'content-type': 'application/json',
          'x-next-page': '0',
        })
        response.end(
          JSON.stringify({
            id: 'challenge-id',
            billing: { billingAccountId: 80000069, markup: 0.5 },
          }),
        )
      })
    })

    const port = await listen(server)
    const baseUrl = `http://127.0.0.1:${port}`
    const appConfig: AppConfig = {
      logger: { disableLogging: false, logLevel: 'debug' },
      kafka: {
        brokers: ['localhost:9092'],
        clientId: 'client',
        groupId: 'group',
        topic: 'topic',
        fromBeginning: false,
        sessionTimeout: 60_000,
        heartbeatInterval: 3_000,
        highWaterMark: 1,
        reconnectDelay: 5_000,
        autocreateTopics: false,
      },
      challengeApiUrl: `${baseUrl}/v6/challenges`,
      auth,
    }
    const configService = {
      getOrThrow: (key: keyof AppConfig) => appConfig[key],
    } as unknown as ConfigService<AppConfig, true>

    try {
      const service = new ChallengeApiService(configService)
      assert.equal(endpoint.isDone(), false)

      const apiResponse = await service.updateChallenge('challenge-id', {
        billing: { billingAccountId: 80000069, markup: 0.5 },
      })
      await service.updateChallenge('challenge-id', {
        billing: { billingAccountId: 80000069, markup: 0.5 },
      })

      assert.equal(endpoint.isDone(), true)
      assert.equal(received.method, 'PATCH')
      assert.equal(received.url, '/v6/challenges/challenge-id')
      assert.equal(received.authorization, `Bearer ${token}`)
      assert.deepEqual(received.body, {
        billing: { billingAccountId: 80000069, markup: 0.5 },
      })
      assert.equal(apiResponse.headers['x-next-page'], '0')
      assert.equal(apiResponse.body.id, 'challenge-id')
    } finally {
      await close(server)
      nock.cleanAll()
    }
  })

  it('rejects wrong-audience and member-shaped tokens before Challenge transport', async () => {
    for (const overrides of [
      { aud: 'wrong-api' },
      { roles: ['administrator'], userId: 123 },
    ]) {
      mockIssuer(machineToken(overrides))
      const config = {
        getOrThrow: (key: string) =>
          key === 'auth' ? auth : 'http://127.0.0.1:1/challenges',
      } as unknown as ConfigService<AppConfig, true>
      const service = new ChallengeApiService(config)
      await assert.rejects(
        service.updateChallenge('id', {}),
        /^Error: Keycloak M2M token request failed$/,
      )
      nock.cleanAll()
    }
  })
})
