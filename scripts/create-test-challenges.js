const logger = require('../src/utils/logger.util')
const { createChallenge: createTcChallenge, putChallenge, updateChallenge } = require('../src/utils/topcoder-api.util')
const newChallengeParams = require('../sample-data/new_challenge.json')
const draftChallengeParams = require('../sample-data/draft_challenge.json')
const activeChallengeParams = require('../sample-data/active_challenge.json')

async function wait (ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

async function createNewChallenge (params) {
  const rsp = await createTcChallenge(params)
  const challenge = JSON.parse(rsp.text)
  logger.info(`Created challenge: ${challenge.id} in project: ${challenge.projectId} with status ${challenge.status}`)
}

async function createDraftChallenge (params) {
  let rsp = await createTcChallenge(newChallengeParams)
  let challenge = JSON.parse(rsp.text)
  rsp = await putChallenge(challenge.id, params)
  challenge = JSON.parse(rsp.text)
  logger.info(`Created challenge: ${challenge.id} in project: ${challenge.projectId} with status ${challenge.status}`)
}

async function createActiveChallenge (params) {
  let rsp = await createTcChallenge(newChallengeParams)
  let challenge = JSON.parse(rsp.text)
  await putChallenge(challenge.id, draftChallengeParams)
  // wait for a few seconds so that legacy challenge is created and then activate the challenge
  logger.info(`Challenge id: ${challenge.id} Waiting for 20 seconds to allow time for legacy challenge creation before activating`)
  await wait(20000)
  rsp = await updateChallenge(challenge.id, params)
  challenge = JSON.parse(rsp.text)
  logger.info(`Created challenge: ${challenge.id} in project: ${challenge.projectId} with status ${challenge.status}`)
}

(async () => {
  await createNewChallenge(newChallengeParams)
  await createDraftChallenge(draftChallengeParams)
  await createActiveChallenge(activeChallengeParams)
})()
