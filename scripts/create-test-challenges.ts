import 'reflect-metadata'

import { Logger, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import activeChallengeParams from '../sample-data/active_challenge.json' with { type: 'json' }
import draftChallengeParams from '../sample-data/draft_challenge.json' with { type: 'json' }
import newChallengeParams from '../sample-data/new_challenge.json' with { type: 'json' }
import { ChallengeApiModule } from '../src/challenge-api/challenge-api.module.js'
import { ChallengeApiService } from '../src/challenge-api/challenge-api.service.js'
import type {
  Challenge,
  JsonObject,
} from '../src/challenge-api/challenge-api.types.js'
import configuration from '../src/config/configuration.js'
import { validateEnvironment } from '../src/config/env.validation.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    ChallengeApiModule,
  ],
})
class TestChallengeScriptModule {}

const logger = new Logger('CreateTestChallenges')
const futureStartDate = new Date(
  Date.now() + 24 * 60 * 60 * 1_000,
).toISOString()
const newChallengeBody: JsonObject = {
  ...newChallengeParams,
  startDate: futureStartDate,
}
const draftChallengeBody: JsonObject = {
  ...draftChallengeParams,
  startDate: futureStartDate,
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function logCreatedChallenge(challenge: Challenge): void {
  logger.log(
    `Created challenge ${challenge.id} in project ${String(challenge.projectId)} with status ${String(challenge.status)}`,
  )
}

async function createNewChallenge(
  challengeApi: ChallengeApiService,
  params: JsonObject,
): Promise<void> {
  const response = await challengeApi.createChallenge(params)
  logCreatedChallenge(response.body)
}

async function createDraftChallenge(
  challengeApi: ChallengeApiService,
  params: JsonObject,
): Promise<void> {
  const created = await challengeApi.createChallenge(newChallengeBody)
  const response = await challengeApi.putChallenge(created.body.id, params)
  logCreatedChallenge(response.body)
}

async function createActiveChallenge(
  challengeApi: ChallengeApiService,
  params: JsonObject,
): Promise<void> {
  const created = await challengeApi.createChallenge(newChallengeBody)
  await challengeApi.putChallenge(created.body.id, draftChallengeBody)

  logger.log(
    `Waiting 20 seconds for legacy challenge creation before activating challenge ${created.body.id}`,
  )
  await wait(20_000)

  const response = await challengeApi.updateChallenge(created.body.id, params)
  logCreatedChallenge(response.body)
}

async function main(): Promise<void> {
  const application = await NestFactory.createApplicationContext(
    TestChallengeScriptModule,
  )

  try {
    const challengeApi = application.get(ChallengeApiService)
    await createNewChallenge(challengeApi, newChallengeBody)
    await createDraftChallenge(challengeApi, draftChallengeBody)
    await createActiveChallenge(
      challengeApi,
      activeChallengeParams as JsonObject,
    )
  } finally {
    await application.close()
  }
}

main().catch((error: unknown) => {
  logger.error('Failed to create test challenges', error)
  process.exitCode = 1
})
