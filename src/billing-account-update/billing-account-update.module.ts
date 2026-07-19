import { Module } from '@nestjs/common'

import { ChallengeApiModule } from '../challenge-api/challenge-api.module.js'
import { BillingAccountUpdateService } from './billing-account-update.service.js'

@Module({
  imports: [ChallengeApiModule],
  providers: [BillingAccountUpdateService],
  exports: [BillingAccountUpdateService],
})
export class BillingAccountUpdateModule {}
