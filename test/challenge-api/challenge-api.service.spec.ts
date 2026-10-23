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
// USE_KEYCLOAK=true: the unreachable Auth0 settings must be ignored.
const auth = {
  USE_KEYCLOAK: 'true',
  AUTH0_URL: 'https://auth0.billing-test.example/oauth/token',
  AUTH0_AUDIENCE: 'https://m2m.example.com/',
  AUTH0_CLIENT_ID: 'auth0-billing-worker',
  AUTH0_CLIENT_SECRET: 'auth0-secret',
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

/** Build the worker config used by ChallengeApiService; returns a ConfigService stub. */
function configFor(
  challengeApiUrl: string,
  authConfig: AppConfig['auth'],
): ConfigService<AppConfig, true> {
  const values = { challengeApiUrl, auth: authConfig }
  return {
    getOrThrow: (key: 'challengeApiUrl' | 'auth') => values[key],
  } as unknown as ConfigService<AppConfig, true>
}

/** Unsigned JWT-shaped Auth0 fixture with an expiry, so the core caches it. */
function auth0Token(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
    'base64url',
  )
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1_000) + 3_600 }),
  ).toString('base64url')
  return `${header}.${payload}.signature`
}

describe('ChallengeApiService', () => {
  for (const [name, flag] of [
    ['unset', {}],
    ['false', { USE_KEYCLOAK: 'false' }],
  ] as const) {
    it(`requests and caches an Auth0 token when USE_KEYCLOAK is ${name}`, async () => {
      const token = auth0Token()
      const tokenRequests: unknown[] = []
      let authorization: string | undefined
      const server = createServer((request, response) => {
        const chunks: Buffer[] = []
        request.on('data', (chunk: Buffer) => chunks.push(chunk))
        request.on('end', () => {
          response.writeHead(200, { 'content-type': 'application/json' })
          if (request.url === '/proxy/token') {
            tokenRequests.push(
              JSON.parse(Buffer.concat(chunks).toString('utf8')),
            )
            response.end(JSON.stringify({ access_token: token }))
            return
          }
          authorization = request.headers.authorization
          response.end(JSON.stringify({ id: 'challenge-id' }))
        })
      })
      const baseUrl = `http://127.0.0.1:${await listen(server)}`
      const clientId = `auth0-billing-${name}-${Date.now()}`
      const service = new ChallengeApiService(
        configFor(`${baseUrl}/v6/challenges`, {
          ...auth,
          USE_KEYCLOAK: undefined,
          ...flag,
          AUTH0_URL: `${baseUrl}/oauth/token`,
          AUTH0_PROXY_SERVER_URL: `${baseUrl}/proxy/token`,
          AUTH0_CLIENT_ID: clientId,
        }),
      )

      try {
        await service.updateChallenge('challenge-id', {})
        await service.updateChallenge('challenge-id', {})

        assert.deepEqual(tokenRequests, [
          {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: 'auth0-secret',
            auth0_url: `${baseUrl}/oauth/token`,
            audience: 'https://m2m.example.com/',
          },
        ])
        assert.equal(authorization, `Bearer ${token}`)
      } finally {
        await close(server)
      }
    })
  }

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
