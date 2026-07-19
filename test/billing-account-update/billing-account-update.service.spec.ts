import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { ChallengeApiService } from '../../src/challenge-api/challenge-api.service.js'
import type {
  Challenge,
  ChallengeApiResponse,
  GetChallengesQueryParams,
  JsonObject,
} from '../../src/challenge-api/challenge-api.types.js'
import { BillingAccountUpdateService } from '../../src/billing-account-update/billing-account-update.service.js'
import { InvalidBillingAccountUpdateError } from '../../src/billing-account-update/billing-account-update.validation.js'

const validUpdate = {
  projectId: 22306,
  projectName: 'Example project',
  directProjectId: null,
  status: 'active',
  oldBillingAccountId: 80000068,
  newBillingAccountId: '80000069',
}

function challengeResponse(
  body: Challenge[],
  nextPage = '0',
): ChallengeApiResponse<Challenge[]> {
  return {
    body,
    text: JSON.stringify(body),
    headers: { 'x-next-page': nextPage },
    status: 200,
  }
}

function updateResponse(id: string): ChallengeApiResponse<Challenge> {
  const body = { id }
  return { body, text: JSON.stringify(body), headers: {}, status: 200 }
}

void describe('BillingAccountUpdateService', () => {
  void it('paginates every eligible status and updates challenges sequentially', async () => {
    const queries: GetChallengesQueryParams[] = []
    const updates: Array<{ id: string; patch: JsonObject }> = []
    let inFlight = 0
    let maximumInFlight = 0

    const pages: Record<string, ChallengeApiResponse<Challenge[]>> = {
      'Active:1': challengeResponse(
        [
          {
            id: 'active-update',
            billing: { billingAccountId: '80000068', markup: 0.5 },
          },
          {
            id: 'same-id-different-type',
            billing: { billingAccountId: 80000069, markup: 0.25 },
          },
          { id: 'without-billing' },
        ],
        '2',
      ),
      'Active:2': challengeResponse([
        {
          id: 'active-page-two',
          billing: { billingAccountId: 80000067, markup: null },
        },
      ]),
      'Draft:1': challengeResponse([
        {
          id: 'failed-draft-update',
          billing: { billingAccountId: 1, markup: 0.1 },
        },
        {
          id: 'draft-after-failure',
          billing: { billingAccountId: 2, markup: 0.2 },
        },
      ]),
      'New:1': challengeResponse([]),
    }

    const challengeApi = {
      getChallenges: async (query: GetChallengesQueryParams) => {
        queries.push(query)
        const response = pages[`${query.status}:${query.page}`]
        assert.ok(response)
        return response
      },
      updateChallenge: async (id: string, patch: JsonObject) => {
        inFlight += 1
        maximumInFlight = Math.max(maximumInFlight, inFlight)
        updates.push({ id, patch })
        await new Promise((resolve) => setTimeout(resolve, 2))
        inFlight -= 1

        if (id === 'failed-draft-update') {
          throw new Error('simulated PATCH failure')
        }

        return updateResponse(id)
      },
    } as unknown as ChallengeApiService

    const service = new BillingAccountUpdateService(challengeApi)
    await service.updateBillingAccount(validUpdate)

    assert.deepEqual(queries, [
      { projectId: 22306, status: 'Active', page: 1 },
      { projectId: 22306, status: 'Active', page: 2 },
      { projectId: 22306, status: 'Draft', page: 1 },
      { projectId: 22306, status: 'New', page: 1 },
    ])
    assert.equal(maximumInFlight, 1)
    assert.deepEqual(
      updates.map(({ id }) => id),
      [
        'active-update',
        'active-page-two',
        'failed-draft-update',
        'draft-after-failure',
      ],
    )
    assert.deepEqual(updates[0]?.patch, {
      billing: { billingAccountId: '80000069', markup: 0.5 },
    })
    assert.deepEqual(updates[1]?.patch, {
      billing: { billingAccountId: '80000069', markup: null },
    })
    assert.deepEqual(updates[3]?.patch, {
      billing: { billingAccountId: '80000069', markup: 0.2 },
    })
  })

  void it('rejects incomplete payloads with a domain validation error', async () => {
    const service = new BillingAccountUpdateService({} as ChallengeApiService)

    await assert.rejects(
      service.updateBillingAccount({ projectId: 22306 }),
      InvalidBillingAccountUpdateError,
    )
  })

  void it('accepts the minimal legacy-compatible payload shape', async () => {
    const queriedStatuses: string[] = []
    const challengeApi = {
      getChallenges: async (query: GetChallengesQueryParams) => {
        queriedStatuses.push(query.status)
        return challengeResponse([])
      },
    } as unknown as ChallengeApiService
    const service = new BillingAccountUpdateService(challengeApi)

    await service.updateBillingAccount({
      projectId: 22306,
      newBillingAccountId: 80000069,
    })

    assert.deepEqual(queriedStatuses, ['Active', 'Draft', 'New'])
  })

  void it('propagates fetch failures so Kafka can retry the event', async () => {
    const queriedStatuses: string[] = []
    const challengeApi = {
      getChallenges: async (query: GetChallengesQueryParams) => {
        queriedStatuses.push(query.status)
        throw new Error('challenge API unavailable')
      },
    } as unknown as ChallengeApiService

    const service = new BillingAccountUpdateService(challengeApi)
    await assert.rejects(
      service.updateBillingAccount(validUpdate),
      /challenge API unavailable/,
    )
    assert.deepEqual(queriedStatuses, ['Active'])
  })
})
