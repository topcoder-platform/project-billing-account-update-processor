import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { ChallengeApiService } from './challenge-api.service.js'

@Module({
  imports: [ConfigModule],
  providers: [ChallengeApiService],
  exports: [ChallengeApiService],
})
export class ChallengeApiModule {}
