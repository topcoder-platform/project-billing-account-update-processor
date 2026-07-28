import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  MessagesStreamFallbackModes,
  MessagesStreamModes,
  type Consumer,
  type Message,
  type MessagesStream,
} from '@platformatic/kafka'

import { BillingAccountUpdateService } from '../billing-account-update/billing-account-update.service.js'
import { InvalidBillingAccountUpdateError } from '../billing-account-update/billing-account-update.validation.js'
import type { AppConfig, KafkaConfig } from '../config/config.types.js'
import { KafkaClientFactory } from './kafka-client.factory.js'
import { InvalidKafkaEventError, parseKafkaEvent } from './kafka-event.js'

@Injectable()
export class KafkaConsumerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(KafkaConsumerService.name)
  private readonly config: KafkaConfig
  private consumer?: Consumer
  private stream?: MessagesStream<Buffer, Buffer, Buffer, Buffer>
  private processingTask?: Promise<void>
  private reconnectTimer?: NodeJS.Timeout
  private releaseReconnectDelay?: () => void
  private shuttingDown = false
  private readonly closingStreams = new WeakSet<object>()

  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly billingAccountUpdateService: BillingAccountUpdateService,
    private readonly kafkaClientFactory: KafkaClientFactory,
  ) {
    this.config = configService.getOrThrow('kafka', { infer: true })
  }

  async onApplicationBootstrap(): Promise<void> {
    this.consumer = this.kafkaClientFactory.create(this.config)
    this.consumer.on('error', (error) => {
      this.logger.error('Platformatic Kafka consumer error', error)
    })

    const initialStream = await this.openStream()
    this.processingTask = this.run(initialStream).catch((error: unknown) => {
      this.logger.fatal('Kafka processing loop stopped unexpectedly', error)
      process.exitCode = 1
    })
  }

  async onApplicationShutdown(): Promise<void> {
    this.shuttingDown = true
    this.cancelReconnectDelay()

    if (this.stream !== undefined) {
      await this.closeStream(this.stream)
    }

    await this.processingTask

    if (this.consumer !== undefined) {
      try {
        await this.consumer.close()
      } catch (error) {
        this.logger.warn(
          'Graceful Kafka consumer close failed; forcing closure',
        )
        this.logger.debug(error)
        await this.consumer.close(true)
      }
    }
  }

  private async run(
    initialStream: MessagesStream<Buffer, Buffer, Buffer, Buffer>,
  ): Promise<void> {
    let nextStream: MessagesStream<Buffer, Buffer, Buffer, Buffer> | undefined =
      initialStream

    while (!this.shuttingDown) {
      let currentStream:
        MessagesStream<Buffer, Buffer, Buffer, Buffer> | undefined

      try {
        currentStream = nextStream ?? (await this.openStream())
        nextStream = undefined
        this.stream = currentStream
        await this.consumeStream(currentStream)

        if (!this.shuttingDown) {
          throw new Error('Kafka message stream ended unexpectedly')
        }
      } catch (error) {
        if (!this.shuttingDown) {
          this.logger.error(
            `Kafka stream failed; retrying in ${this.config.reconnectDelay}ms`,
            error,
          )
        }
      } finally {
        if (currentStream !== undefined) {
          await this.closeStream(currentStream)
        }
      }

      if (!this.shuttingDown) {
        await this.waitForReconnect()
      }
    }
  }

  private async openStream(): Promise<
    MessagesStream<Buffer, Buffer, Buffer, Buffer>
  > {
    if (this.consumer === undefined) {
      throw new Error('Kafka consumer has not been created')
    }

    const stream = await this.consumer.consume({
      topics: [this.config.topic],
      autocommit: false,
      mode: MessagesStreamModes.COMMITTED,
      fallbackMode: this.config.fromBeginning
        ? MessagesStreamFallbackModes.EARLIEST
        : MessagesStreamFallbackModes.LATEST,
      highWaterMark: this.config.highWaterMark,
    })

    this.logger.log(
      `Subscribed to Kafka topic ${this.config.topic} as consumer group ${this.config.groupId}`,
    )
    return stream
  }

  private async consumeStream(
    stream: MessagesStream<Buffer, Buffer, Buffer, Buffer>,
  ): Promise<void> {
    for await (const message of stream) {
      await this.processMessage(message)
    }
  }

  private async processMessage(
    message: Message<Buffer, Buffer, Buffer, Buffer>,
  ): Promise<void> {
    try {
      const event = parseKafkaEvent(message.value)
      this.logger.debug(
        `Message from ${message.topic}[${message.partition}] at offset ${String(message.offset)}`,
      )
      await this.billingAccountUpdateService.updateBillingAccount(event.payload)
    } catch (error) {
      if (
        error instanceof InvalidKafkaEventError ||
        error instanceof InvalidBillingAccountUpdateError
      ) {
        this.logger.error(
          `Discarding invalid message from ${message.topic}[${message.partition}] at offset ${String(message.offset)}: ${error.message}`,
        )
        await message.commit()
        return
      }

      throw error
    }

    await message.commit()
  }

  private async closeStream(
    stream: MessagesStream<Buffer, Buffer, Buffer, Buffer>,
  ): Promise<void> {
    if (this.closingStreams.has(stream)) return
    this.closingStreams.add(stream)
    if (this.stream === stream) this.stream = undefined

    try {
      if (!stream.closed && !stream.destroyed) {
        await stream.close()
      }
    } catch (error) {
      if (!this.shuttingDown) {
        this.logger.warn('Error while closing Kafka message stream')
        this.logger.debug(error)
      }
    }
  }

  private waitForReconnect(): Promise<void> {
    return new Promise((resolve) => {
      const finish = (): void => {
        if (this.reconnectTimer !== undefined) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = undefined
        }
        this.releaseReconnectDelay = undefined
        resolve()
      }

      this.releaseReconnectDelay = finish
      this.reconnectTimer = setTimeout(finish, this.config.reconnectDelay)
    })
  }

  private cancelReconnectDelay(): void {
    this.releaseReconnectDelay?.()
  }
}
