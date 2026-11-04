import { createServer, type Server } from 'node:http'

import {
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common'

import { KafkaConsumerService } from '../kafka/kafka-consumer.service.js'

export function createHealthServer(isReady: () => boolean): Server {
  return createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/health') {
      response.writeHead(404).end()
      return
    }
    const ready = isReady()
    response.writeHead(ready ? 200 : 503, { 'Content-Type': 'text/plain' })
    response.end(ready ? 'ready' : 'unavailable')
  })
}

@Injectable()
export class HealthService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private server?: Server

  constructor(private readonly consumer: KafkaConsumerService) {}

  async onApplicationBootstrap(): Promise<void> {
    this.server = createHealthServer(() => this.consumer.isReady())
    const server = this.server
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(3001, '127.0.0.1', resolve)
    })
  }

  async onApplicationShutdown(): Promise<void> {
    const server = this.server
    if (server !== undefined) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) =>
          error === undefined ? resolve() : reject(error),
        )
      })
    }
  }
}
