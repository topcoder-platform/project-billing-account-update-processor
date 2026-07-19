import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { BillingAccountUpdateModule } from './billing-account-update/billing-account-update.module.js'
import configuration from './config/configuration.js'
import { validateEnvironment } from './config/env.validation.js'
import { KafkaModule } from './kafka/kafka.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    BillingAccountUpdateModule,
    KafkaModule,
  ],
})
export class AppModule {}
