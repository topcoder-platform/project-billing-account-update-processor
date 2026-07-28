import { Module } from '@nestjs/common'

import { BillingAccountUpdateModule } from '../billing-account-update/billing-account-update.module.js'
import { KafkaClientFactory } from './kafka-client.factory.js'
import { KafkaConsumerService } from './kafka-consumer.service.js'

@Module({
  imports: [BillingAccountUpdateModule],
  providers: [KafkaClientFactory, KafkaConsumerService],
})
export class KafkaModule {}
