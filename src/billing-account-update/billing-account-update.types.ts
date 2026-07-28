import type { BillingAccountId } from '../challenge-api/challenge-api.types.js'

export interface BillingAccountUpdate {
  projectId: number
  projectName?: string
  directProjectId?: number | null
  status?: string
  oldBillingAccountId?: BillingAccountId
  newBillingAccountId: BillingAccountId
}

export interface KafkaEventEnvelope {
  topic?: string
  originator?: string
  timestamp?: string
  'mime-type'?: string
  payload: unknown
}
