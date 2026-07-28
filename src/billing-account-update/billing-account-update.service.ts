import { Injectable, Logger } from '@nestjs/common'

import { ChallengeApiService } from '../challenge-api/challenge-api.service.js'
import type {
  Challenge,
  JsonObject,
} from '../challenge-api/challenge-api.types.js'
import type { BillingAccountUpdate } from './billing-account-update.types.js'
import { parseBillingAccountUpdate } from './billing-account-update.validation.js'

const CHALLENGE_STATUSES = ['Active', 'Draft', 'New'] as const

@Injectable()
export class BillingAccountUpdateService {
  private readonly logger = new Logger(BillingAccountUpdateService.name)

  constructor(private readonly challengeApi: ChallengeApiService) {}

  async updateBillingAccount(input: unknown): Promise<void> {
    const update = parseBillingAccountUpdate(input)
    const description = `project ${update.projectId} to billing account ${String(update.newBillingAccountId)}`

    this.logger.log(`Processing started for ${description}`)

    try {
      const challengesToUpdate: Challenge[] = []

      for (const status of CHALLENGE_STATUSES) {
        const challenges = await this.getAllChallenges(update.projectId, status)
        this.logger.debug(
          `Challenges to process with ${status} status: ${challenges.length}`,
        )
        challengesToUpdate.push(...challenges)
      }

      for (const challenge of challengesToUpdate) {
        await this.updateChallengeIfNeeded(challenge, update)
      }
    } catch (error) {
      this.logger.error(`Processing failed for ${description}`, error)
      throw error
    } finally {
      this.logger.log(`Processing complete for ${description}`)
    }
  }

  private async getAllChallenges(
    projectId: number,
    status: string,
  ): Promise<Challenge[]> {
    const challenges: Challenge[] = []
    const visitedPages = new Set<number>()
    let page = 1

    while (page > 0) {
      if (visitedPages.has(page)) {
        throw new Error(
          `Challenge API pagination repeated page ${page} for project ${projectId} and status ${status}`,
        )
      }
      visitedPages.add(page)

      const response = await this.challengeApi.getChallenges({
        projectId,
        status,
        page,
      })

      if (!Array.isArray(response.body)) {
        throw new Error(
          `Challenge API returned a non-array response for project ${projectId} and status ${status}`,
        )
      }

      challenges.push(...response.body)
      page = this.nextPage(response.headers['x-next-page'])
    }

    return challenges
  }

  private nextPage(header: string | undefined): number {
    if (header === undefined || header.trim() === '') return 0

    const page = Number(header)
    return Number.isInteger(page) && page > 0 ? page : 0
  }

  private async updateChallengeIfNeeded(
    challenge: Challenge,
    update: BillingAccountUpdate,
  ): Promise<void> {
    const billingData = challenge.billing
    if (
      typeof billingData !== 'object' ||
      billingData === null ||
      Array.isArray(billingData)
    ) {
      this.logger.debug(
        `Skipping challenge ${challenge.id} because it has no billing data`,
      )
      return
    }

    const currentBillingAccountId = billingData.billingAccountId
    if (
      String(currentBillingAccountId) === String(update.newBillingAccountId)
    ) {
      this.logger.debug(
        `Skipping challenge ${challenge.id}; it already uses billing account ${String(update.newBillingAccountId)}`,
      )
      return
    }

    const billing: JsonObject = {
      billingAccountId: update.newBillingAccountId,
      markup: billingData.markup,
    }
    const patch: JsonObject = { billing }

    this.logger.debug(
      `Updating challenge ${challenge.id} to billing account ${String(update.newBillingAccountId)}`,
    )

    try {
      await this.challengeApi.updateChallenge(challenge.id, patch)
    } catch (error) {
      this.logger.error(
        `Error updating challenge ${challenge.id}; continuing with the remaining challenges`,
        error,
      )
    }
  }
}
