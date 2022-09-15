const _ = require('lodash')
const Joi = require('joi')
const { getChallenges, updateChallenge } = require('../utils/topcoder-api.util')
const { CHALLENGE_STATUSES } = require('../constants')
const logger = require('../utils/logger.util')

const updateSchema = Joi.object({
  projectId: Joi.number(),
  projectName: Joi.string(),
  directProjectId: Joi.number(),
  status: Joi.string(),
  oldBillingAccountId: Joi.string(),
  newBillingAccountId: Joi.string()
})

async function updateBillingAccount (message) {
  const { value: payload, error } = await updateSchema.validate(message)
  if (error) { throw error }

  logger.info(`Processing started for billing account update of project: ${payload.projectId} to billingAccountId: ${payload.newBillingAccountId}`)
  try {
    const activeChallenges = await getAllChallenges({
      projectId: payload.projectId,
      status: CHALLENGE_STATUSES.ACTIVE
    })

    logger.debug(`Challenges to process with Active status ${activeChallenges.length}`)

    const draftChallenges = await getAllChallenges({
      projectId: payload.projectId,
      status: CHALLENGE_STATUSES.DRAFT
    })

    logger.debug(`Challenges to process with Draft status ${draftChallenges.length}`)

    const newChallenges = await getAllChallenges({
      projectId: payload.projectId,
      status: CHALLENGE_STATUSES.NEW
    })

    logger.debug(`Challenges to process with New status ${newChallenges.length}`)

    const challengesToUpdate = [...activeChallenges, ...draftChallenges, ...newChallenges]
    for (const c of challengesToUpdate) {
      if (_.get(c, 'billing')) {
        if (_.get(c, 'billing.billingAccountId') !== payload.newBillingAccountId) {
          logger.debug(`Updating challenge: ${c.id} to billingAccountId: ${payload.newBillingAccountId}`)
          const patchObj = {
            billing: {
              billingAccountId: payload.newBillingAccountId,
              markup: _.get(c, 'billing.markup')
            }
          }
          try {
            await updateChallenge(c.id, patchObj)
          } catch (err) {
            logger.error(`Error in updating challenge: ${c.id}`)
            logger.error(err)
          }
        } else {
          logger.debug(`Skipping challenge: ${c.id} as it already has billingAccountId: ${payload.newBillingAccountId}`)
        }
      } else {
        logger.debug(`Skipping challenge: ${c.id} as it doesn't have billing key`)
      }
    }
  } catch (err) {
    logger.error(err)
  }
  logger.info(`Processing complete for billing account update of project: ${payload.projectId} to billingAccountId: ${payload.newBillingAccountId}`)
}

/**
 * Gets all the challenges corresponding to given query params
 * @param queryParams the query params
 * @return {Promise<any[]>} Array of challenges
 */
async function getAllChallenges (queryParams) {
  let page = 1
  const { text: rspStr, headers } = await getChallenges({
    ...queryParams,
    page
  })
  let nextPage = +headers['x-next-page']
  let challenges = JSON.parse(rspStr)
  while (nextPage > 0) {
    page = nextPage
    const rsp = await getChallenges({
      ...queryParams,
      page
    })
    challenges = [...challenges, ...JSON.parse(rsp.text)]
    nextPage = +rsp.headers['x-next-page']
  }

  return challenges
}

module.exports = {
  updateBillingAccount
}
