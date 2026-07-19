import { Injectable } from '@nestjs/common'
import { Consumer } from '@platformatic/kafka'

import type { KafkaConfig } from '../config/config.types.js'

@Injectable()
export class KafkaClientFactory {
  create(config: KafkaConfig): Consumer {
    return new Consumer({
      clientId: config.clientId,
      groupId: config.groupId,
      bootstrapBrokers: config.brokers,
      autocommit: false,
      sessionTimeout: config.sessionTimeout,
      heartbeatInterval: config.heartbeatInterval,
      highWaterMark: config.highWaterMark,
      autocreateTopics: config.autocreateTopics,
    })
  }
}
