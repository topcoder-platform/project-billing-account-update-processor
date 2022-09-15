const config = require('config')
const _ = require('lodash')
const m2mAuth = require('tc-core-library-js').auth.m2m
const request = require('superagent')

let m2m = null

/**
 * Function to get M2M token
 */
async function getM2MToken () {
  if (_.isNull(m2m)) {
    m2m = m2mAuth(
      _.pick(config.AUTH, [
        'AUTH0_URL',
        'AUTH0_AUDIENCE',
        'TOKEN_CACHE_TIME',
        'AUTH0_PROXY_SERVER_URL'
      ])
    )
  }

  return m2m.getMachineToken(
    config.AUTH.AUTH0_CLIENT_ID,
    config.AUTH.AUTH0_CLIENT_SECRET
  )
}

/**
 * Function to send request to V5 API
 * @param {String} reqType Type of the request POST / PATCH / PUT / GET / DELETE / HEAD
 * @param {String} path Complete path of the API URL
 * @param {Object} reqBody Body of the request
 * @param {Object} queryParams query params of the request
 */
async function reqToAPI (reqType, path, reqBody, queryParams = {}) {
  const token = await getM2MToken()
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

  const validReqTypes = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']
  const hasBody = ['POST', 'PUT', 'PATCH']

  if (_.indexOf(validReqTypes, _.upperCase(reqType)) === -1) {
    throw new Error('Invalid request type')
  }
  const reqMethod = request[_.lowerCase(reqType)]

  if (_.indexOf(hasBody, _.upperCase(reqType)) === -1) {
    return reqMethod(path)
      .query(queryParams)
      .set(authHeader)
      .set('Content-Type', 'application/json')
  } else {
    return reqMethod(path)
      .query(queryParams)
      .set(authHeader)
      .set('Content-Type', 'application/json')
      .send(reqBody)
  }
}

/**
 * Creates a challenge with the given body
 * @param body the challenge body
 */
async function createChallenge (body) {
  const path = `${config.CHALLENGE_API_URL}`
  return reqToAPI('POST', path, body)
}

/**
 * Get challenges by filtering with the given query params
 * @param {Object} queryParams query params
 */
async function getChallenges (queryParams) {
  const path = `${config.CHALLENGE_API_URL}`
  return reqToAPI('GET', path, null, queryParams)
}

/**
 * Replace the challenge data with the given object
 * @param challengeId the challenge id
 * @param data the data to put in the challenge
 */
async function putChallenge (challengeId, data) {
  const path = `${config.CHALLENGE_API_URL}/${challengeId}`
  return reqToAPI('PUT', path, data)
}

/**
 * Update the challenge
 * @param {String} challengeId Challenge's ID (uuid)
 * @param {Object} data the data to update
 */
async function updateChallenge (challengeId, data) {
  const path = `${config.CHALLENGE_API_URL}/${challengeId}`
  return reqToAPI('PATCH', path, data)
}

module.exports = {
  putChallenge,
  updateChallenge,
  getChallenges,
  createChallenge
}
