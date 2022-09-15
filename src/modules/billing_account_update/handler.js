const { updateBillingAccount } = require('../../services/BillingAccountUpdateProcessor')

const messageQueue = []
let isProcessing = false

/**
 * Handle a set of messages from the Kafka topic
 * @param {Array} messageSet
 */
async function handler (messageSet) {
  messageQueue.push(messageSet)
  await handleMessages()
}

async function handleMessages () {
  if (!isProcessing) {
    isProcessing = true
    while (messageQueue.length > 0) {
      const messageSet = messageQueue.shift()
      for (const message of messageSet) {
        await updateBillingAccount(message)
      }
    }
    isProcessing = false
  }
}

module.exports = handler
