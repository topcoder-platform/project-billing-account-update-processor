export type BillingAccountId = string | number

export type JsonValue =
  string | number | boolean | null | JsonObject | JsonValue[]

export interface JsonObject {
  [key: string]: JsonValue | undefined
}

export interface ChallengeBilling extends JsonObject {
  billingAccountId?: BillingAccountId
  markup?: JsonValue
}

export interface Challenge extends JsonObject {
  id: string
  projectId?: string | number
  status?: string
  billing?: ChallengeBilling | null
}

export interface GetChallengesQueryParams {
  projectId: number
  status: string
  page: number
  pageSize?: number
  [key: string]: string | number | boolean | undefined
}

export interface ChallengeApiResponse<TBody> {
  body: TBody
  text: string
  headers: Record<string, string | undefined>
  status: number
}

export type ApiHttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
