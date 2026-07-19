import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { ConfigService } from '@nestjs/config'
import {
  MessagesStreamFallbackModes,
  MessagesStreamModes,
  type Consumer,
  type Message,
  type MessagesStream,
} from '@platformatic/kafka'

import type { BillingAccountUpdateService } from '../../src/billing-account-update/billing-account-update.service.js'
import { InvalidBillingAccountUpdateError } from '../../src/billing-account-update/billing-account-update.validation.js'
import type { AppConfig, KafkaConfig } from '../../src/config/config.types.js'
import type { KafkaClientFactory } from '../../src/kafka/kafka-client.factory.js'
import { KafkaConsumerService } from '../../src/kafka/kafka-consumer.service.js'
import {
  InvalidKafkaEventError,
  parseKafkaEvent,
} from '../../src/kafka/kafka-event.js'

type KafkaMessage = Message<Buffer, Buffer, Buffer, Buffer>
type KafkaStream = MessagesStream<Buffer, Buffer, Buffer, Buffer>

const kafkaConfig: KafkaConfig = {
  brokers: ['broker-a:9092', 'broker-b:9092'],
  clientId: 'billing-client',
  groupId: 'billing-group',
  topic: 'project.action.billingAccount.update',
  fromBeginning: false,
  sessionTimeout: 60_000,
  heartbeatInterval: 3_000,
  highWaterMark: 1,
  reconnectDelay: 1,
  autocreateTopics: false,
}

const validPayload = {
  projectId: 22306,
  projectName: 'Example project',
  directProjectId: null,
  status: 'active',
  oldBillingAccountId: '80000068',
  newBillingAccountId: '80000069',
}

function deferred(): {
  promise: Promise<void>
  resolve: () => void
} {
  let resolvePromise!: () => void
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })
  return { promise, resolve: resolvePromise }
}

function kafkaMessage(
  value: string,
  commit: () => Promise<void>,
  offset = 0n,
): KafkaMessage {
  return {
    key: Buffer.alloc(0),
    value: Buffer.from(value),
    headers: new Map(),
    topic: kafkaConfig.topic,
    partition: 0,
    timestamp: 0n,
    offset,
    metadata: {},
    commit,
    toJSON: () => ({
      key: Buffer.alloc(0),
      value: Buffer.from(value),
      headers: [],
      topic: kafkaConfig.topic,
      partition: 0,
      timestamp: '0',
      offset: String(offset),
      metadata: {},
    }),
  }
}

class FakeStream implements AsyncIterable<KafkaMessage> {
  closed = false
  destroyed = false
  private readonly closedSignal = deferred()

  constructor(private readonly messages: KafkaMessage[]) {}

  async close(): Promise<void> {
    this.closed = true
    this.closedSignal.resolve()
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<KafkaMessage> {
    for (const message of this.messages) yield message
    await this.closedSignal.promise
  }
}

interface FakeConsumerState {
  consumeOptions: unknown[]
  closeArguments: Array<boolean | undefined>
}

function fakeConsumer(
  streams: FakeStream[],
  state: FakeConsumerState,
): Consumer {
  return {
    on: () => undefined,
    consume: async (options: unknown) => {
      state.consumeOptions.push(options)
      const stream = streams.shift()
      if (stream === undefined) throw new Error('No fake stream available')
      return stream as unknown as KafkaStream
    },
    close: async (force?: boolean) => {
      state.closeArguments.push(force)
    },
  } as unknown as Consumer
}

function createService(
  consumer: Consumer,
  billingAccountUpdateService: BillingAccountUpdateService,
): KafkaConsumerService {
  const appConfig = { kafka: kafkaConfig } as AppConfig
  const configService = {
    getOrThrow: (key: keyof AppConfig) => appConfig[key],
  } as unknown as ConfigService<AppConfig, true>
  const factory = {
    create: () => consumer,
  } as KafkaClientFactory

  return new KafkaConsumerService(
    configService,
    billingAccountUpdateService,
    factory,
  )
}

void describe('Kafka event parsing', () => {
  void it('extracts a Topcoder event envelope and rejects malformed values', () => {
    const event = parseKafkaEvent(
      Buffer.from(
        JSON.stringify({ topic: kafkaConfig.topic, payload: validPayload }),
      ),
    )
    assert.deepEqual(event.payload, validPayload)

    assert.throws(
      () => parseKafkaEvent(Buffer.from('{not-json')),
      InvalidKafkaEventError,
    )
    assert.throws(() => parseKafkaEvent(undefined), InvalidKafkaEventError)
    assert.throws(
      () => parseKafkaEvent(Buffer.from(JSON.stringify({ topic: 'event' }))),
      InvalidKafkaEventError,
    )
  })
})

void describe('KafkaConsumerService', () => {
  void it('uses committed offsets, processes globally in sequence, and commits afterward', async () => {
    const finished = deferred()
    const processingOrder: number[] = []
    const commitOrder: number[] = []
    let inFlight = 0
    let maximumInFlight = 0

    const messages = [1, 2].map((number) =>
      kafkaMessage(
        JSON.stringify({ payload: { ...validPayload, projectId: number } }),
        async () => {
          commitOrder.push(number)
          if (number === 2) finished.resolve()
        },
        BigInt(number - 1),
      ),
    )
    const stream = new FakeStream(messages)
    const state: FakeConsumerState = {
      consumeOptions: [],
      closeArguments: [],
    }
    const consumer = fakeConsumer([stream], state)
    const billingService = {
      updateBillingAccount: async (payload: unknown) => {
        inFlight += 1
        maximumInFlight = Math.max(maximumInFlight, inFlight)
        processingOrder.push((payload as { projectId: number }).projectId)
        await new Promise((resolve) => setTimeout(resolve, 2))
        inFlight -= 1
      },
    } as BillingAccountUpdateService
    const service = createService(consumer, billingService)

    await service.onApplicationBootstrap()
    await finished.promise
    await service.onApplicationShutdown()

    assert.deepEqual(processingOrder, [1, 2])
    assert.deepEqual(commitOrder, [1, 2])
    assert.equal(maximumInFlight, 1)
    assert.deepEqual(state.consumeOptions[0], {
      topics: [kafkaConfig.topic],
      autocommit: false,
      mode: MessagesStreamModes.COMMITTED,
      fallbackMode: MessagesStreamFallbackModes.LATEST,
      highWaterMark: 1,
    })
    assert.deepEqual(state.closeArguments, [undefined])
  })

  void it('commits invalid records so they do not poison the partition', async () => {
    const finished = deferred()
    const committed: number[] = []
    let updateCalls = 0
    const messages = [
      kafkaMessage('{bad-json', async () => {
        committed.push(0)
      }),
      kafkaMessage(
        JSON.stringify({ payload: {} }),
        async () => {
          committed.push(1)
        },
        1n,
      ),
      kafkaMessage(
        JSON.stringify({ payload: validPayload }),
        async () => {
          committed.push(2)
          finished.resolve()
        },
        2n,
      ),
    ]
    const stream = new FakeStream(messages)
    const state: FakeConsumerState = {
      consumeOptions: [],
      closeArguments: [],
    }
    const consumer = fakeConsumer([stream], state)
    const billingService = {
      updateBillingAccount: async (payload: unknown) => {
        updateCalls += 1
        if (!Object.hasOwn(payload as object, 'projectId')) {
          throw new InvalidBillingAccountUpdateError('invalid payload')
        }
      },
    } as BillingAccountUpdateService
    const service = createService(consumer, billingService)

    await service.onApplicationBootstrap()
    await finished.promise
    await service.onApplicationShutdown()

    assert.equal(updateCalls, 2)
    assert.deepEqual(committed, [0, 1, 2])
  })

  void it('recreates a failed stream and retries from the committed offset', async () => {
    const finished = deferred()
    let attempts = 0
    let commits = 0
    const event = JSON.stringify({ payload: validPayload })
    const firstStream = new FakeStream([
      kafkaMessage(event, async () => {
        commits += 1
      }),
    ])
    const secondStream = new FakeStream([
      kafkaMessage(event, async () => {
        commits += 1
        finished.resolve()
      }),
    ])
    const state: FakeConsumerState = {
      consumeOptions: [],
      closeArguments: [],
    }
    const consumer = fakeConsumer([firstStream, secondStream], state)
    const billingService = {
      updateBillingAccount: async () => {
        attempts += 1
        if (attempts === 1) throw new Error('temporary API failure')
      },
    } as unknown as BillingAccountUpdateService
    const service = createService(consumer, billingService)

    await service.onApplicationBootstrap()
    await finished.promise
    await service.onApplicationShutdown()

    assert.equal(attempts, 2)
    assert.equal(commits, 1)
    assert.equal(state.consumeOptions.length, 2)
    assert.equal(firstStream.closed, true)
    assert.equal(secondStream.closed, true)
  })
})
