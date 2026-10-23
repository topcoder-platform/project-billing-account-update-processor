import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import request from 'superagent'
import core from 'tc-core-library-js'
import type { SuperAgentRequest } from 'superagent'

import type { AppConfig } from '../config/config.types.js'
import type {
  ApiHttpMethod,
  Challenge,
  ChallengeApiResponse,
  GetChallengesQueryParams,
  JsonObject,
} from './challenge-api.types.js'

/** Challenge transport for billing events. A persistent shared-core provider obtains and
 * caches the M2M token before any Challenge API request. The `auth` config's
 * `USE_KEYCLOAK` selects the provider: `true` uses verified Keycloak tokens
 * (`KEYCLOAK_*`); unset or `false` uses Auth0 (`AUTH0_URL`, `AUTH0_AUDIENCE`,
 * `AUTH0_PROXY_SERVER_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`), as before the
 * migration. Configuration/token errors fail closed without forwarding provider
 * response bodies or credentials. Used by the billing account update handler and the
 * development challenge script. */
@Injectable()
export class ChallengeApiService {
  private readonly challengeApiUrl: string
  private readonly m2m: ReturnType<typeof core.auth.m2m>

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    this.challengeApiUrl = this.configService.getOrThrow('challengeApiUrl', {
      infer: true,
    })
    this.m2m = core.auth.m2m(
      this.configService.getOrThrow('auth', { infer: true }),
    )
  }

  createChallenge(body: JsonObject): Promise<ChallengeApiResponse<Challenge>> {
    return this.requestToApi<Challenge>('POST', this.challengeApiUrl, body)
  }

  getChallenges(
    queryParams: GetChallengesQueryParams,
  ): Promise<ChallengeApiResponse<Challenge[]>> {
    return this.requestToApi<Challenge[]>(
      'GET',
      this.challengeApiUrl,
      undefined,
      queryParams,
    )
  }

  putChallenge(
    challengeId: string,
    data: JsonObject,
  ): Promise<ChallengeApiResponse<Challenge>> {
    return this.requestToApi<Challenge>(
      'PUT',
      this.challengePath(challengeId),
      data,
    )
  }

  updateChallenge(
    challengeId: string,
    data: JsonObject,
  ): Promise<ChallengeApiResponse<Challenge>> {
    return this.requestToApi<Challenge>(
      'PATCH',
      this.challengePath(challengeId),
      data,
    )
  }

  private challengePath(challengeId: string): string {
    return `${this.challengeApiUrl}/${encodeURIComponent(challengeId)}`
  }

  /** Send a Challenge API request using the active provider's cached machine token.
   * @param method HTTP operation used by billing processing.
   * @param path Absolute Challenge API endpoint.
   * @param requestBody Optional JSON mutation body.
   * @param queryParams Optional filter parameters.
   * @returns The typed Challenge API response.
   * @throws Sanitized shared-core auth errors or Challenge API transport errors.
   */
  private async requestToApi<TBody>(
    method: ApiHttpMethod,
    path: string,
    requestBody?: JsonObject,
    queryParams: Record<string, unknown> = {},
  ): Promise<ChallengeApiResponse<TBody>> {
    const token = await this.m2m.getMachineToken()
    const authHeader = { Authorization: `Bearer ${token}` }

    let apiRequest = this.createRequest(method, path)
      .query(queryParams)
      .set(authHeader)
      .set('Content-Type', 'application/json')

    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      apiRequest = apiRequest.send(requestBody)
    }

    const response = await apiRequest
    return response as unknown as ChallengeApiResponse<TBody>
  }

  private createRequest(
    method: ApiHttpMethod,
    path: string,
  ): SuperAgentRequest {
    switch (method) {
      case 'GET':
        return request.get(path)
      case 'HEAD':
        return request.head(path)
      case 'POST':
        return request.post(path)
      case 'PUT':
        return request.put(path)
      case 'PATCH':
        return request.patch(path)
      case 'DELETE':
        return request.delete(path)
      default: {
        const exhaustiveCheck: never = method
        throw new Error(`Invalid request type: ${String(exhaustiveCheck)}`)
      }
    }
  }
}
