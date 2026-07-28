import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import request from 'superagent'
import type { SuperAgentRequest } from 'superagent'

import type { AppConfig, AuthConfig } from '../config/config.types.js'
import type {
  ApiHttpMethod,
  Challenge,
  ChallengeApiResponse,
  GetChallengesQueryParams,
  JsonObject,
} from './challenge-api.types.js'

interface MachineTokenResponse {
  access_token?: unknown
  error?: unknown
  error_description?: unknown
  expires_in?: unknown
}

@Injectable()
export class ChallengeApiService {
  private readonly challengeApiUrl: string
  private readonly authConfig: AuthConfig
  private cachedToken?: { value: string; expiresAt: number }
  private tokenRequest?: Promise<string>

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    this.challengeApiUrl = this.configService.getOrThrow('challengeApiUrl', {
      infer: true,
    })
    this.authConfig = this.configService.getOrThrow('auth', { infer: true })
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

  private async getM2MToken(): Promise<string> {
    if (
      this.cachedToken !== undefined &&
      this.cachedToken.expiresAt > Date.now()
    ) {
      return this.cachedToken.value
    }

    if (this.tokenRequest !== undefined) return this.tokenRequest

    const tokenRequest = this.requestMachineToken()
    this.tokenRequest = tokenRequest

    try {
      return await tokenRequest
    } finally {
      if (this.tokenRequest === tokenRequest) this.tokenRequest = undefined
    }
  }

  private async requestMachineToken(): Promise<string> {
    const {
      auth0Audience,
      auth0ClientId,
      auth0ClientSecret,
      auth0ProxyServerUrl,
      auth0Url,
    } = this.authConfig

    if (
      auth0Url === undefined ||
      auth0Audience === undefined ||
      auth0ClientId === undefined ||
      auth0ClientSecret === undefined
    ) {
      throw new Error(
        'AUTH0_URL, AUTH0_AUDIENCE, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET are required to call the Challenge API',
      )
    }

    const response = await request
      .post(auth0ProxyServerUrl ?? auth0Url)
      .set('Content-Type', 'application/json')
      .send({
        grant_type: 'client_credentials',
        client_id: auth0ClientId,
        client_secret: auth0ClientSecret,
        auth0_url: auth0Url,
        audience: auth0Audience,
      })

    const body = response.body as MachineTokenResponse
    if (typeof body.access_token !== 'string' || body.access_token === '') {
      const errorName =
        typeof body.error === 'string'
          ? body.error
          : 'Auth0 did not return an access token'
      const description =
        typeof body.error_description === 'string'
          ? `: ${body.error_description}`
          : ''
      throw new Error(`${errorName}${description}`)
    }

    this.cachedToken = {
      value: body.access_token,
      expiresAt: this.tokenExpiry(body.access_token, body.expires_in),
    }
    return body.access_token
  }

  private tokenExpiry(token: string, expiresIn: unknown): number {
    const now = Date.now()
    const expiryCandidates: number[] = []

    if (typeof expiresIn === 'number' && expiresIn > 0) {
      expiryCandidates.push(now + expiresIn * 1_000)
    }

    try {
      const encodedPayload = token.split('.')[1]
      if (encodedPayload !== undefined) {
        const payload = JSON.parse(
          Buffer.from(encodedPayload, 'base64url').toString('utf8'),
        ) as { exp?: unknown }
        if (typeof payload.exp === 'number') {
          expiryCandidates.push(payload.exp * 1_000)
        }
      }
    } catch {
      // Opaque access tokens can still use the `expires_in` response value.
    }

    if (expiryCandidates.length === 0) return now
    return Math.max(now, Math.min(...expiryCandidates) - 60_000)
  }

  private async requestToApi<TBody>(
    method: ApiHttpMethod,
    path: string,
    requestBody?: JsonObject,
    queryParams: Record<string, unknown> = {},
  ): Promise<ChallengeApiResponse<TBody>> {
    const token = await this.getM2MToken()
    const authHeader: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {}

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
