import assert from 'node:assert/strict'
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

function machineToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
    'base64url',
  )
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1_000) + 3_600 }),
  ).toString('base64url')
  return `${header}.${payload}.signature`
}

describe('ChallengeApiService', () => {
  it('fetches and caches M2M auth before sending a JSON PATCH', async () => {
    let authRequests = 0
    const received: ReceivedRequest = {}
    const token = machineToken()

    const server = createServer((request, response) => {
      if (request.url === '/oauth/token') {
        authRequests += 1
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ access_token: token }))
        return
      }

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
      auth: {
        auth0Audience: 'https://m2m.example.com/',
        auth0Url: `${baseUrl}/oauth/token`,
        auth0ProxyServerUrl: `${baseUrl}/oauth/token`,
        auth0ClientId: `challenge-api-test-${Date.now()}`,
        auth0ClientSecret: 'secret',
      },
    }
    const configService = {
      getOrThrow: (key: keyof AppConfig) => appConfig[key],
    } as unknown as ConfigService<AppConfig, true>

    try {
      const service = new ChallengeApiService(configService)
      assert.equal(authRequests, 0)

      const apiResponse = await service.updateChallenge('challenge-id', {
        billing: { billingAccountId: 80000069, markup: 0.5 },
      })
      await service.updateChallenge('challenge-id', {
        billing: { billingAccountId: 80000069, markup: 0.5 },
      })

      assert.equal(authRequests, 1)
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
    }
  })
})
