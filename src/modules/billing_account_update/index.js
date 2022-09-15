const Kafka = require('no-kafka')
const constants = require('../../constants')
const handler = require('./handler')

module.exports = {
  topics: [constants.KAFKA.TOPICS.BILLING_ACCOUNT_UPDATE_TOPIC],
  handler,
  options: {
    time: Kafka.LATEST_OFFSET
  }
}
