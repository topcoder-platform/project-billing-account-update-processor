const kafka = require('no-kafka')
const _ = require('lodash')
const logger = require('../utils/logger.util')

let consumer

/**
 * Check if a Kafka Consumer has successfully connected
 * @param {SimpleConsumer} consumer
 */
function checkConsumer (consumer) {
  if (
    !consumer.client.initialBrokers ||
    !consumer.client.initialBrokers.length
  ) {
    return true
  }
  const brokers = consumer.client.initialBrokers
  const connected = _.some(brokers, 'connected')

  return connected
}

/**
 * Wrapper function for handler of topics
 * @param {String} topic
 * @param {Function} handler
 */
function handlerWrapper (handler) {
  return async function wrapper (messageSet, topic, partition) {
    try {
      const items = _.map(messageSet, (item) => {
        const i = JSON.parse(item.message.value.toString('utf8'))
        return i.payload
      })
      logger.debug(`Message from ${topic}: ${JSON.stringify(items)}`)
      handler(items, topic, partition)
    } catch (err) {
      const errMessage = `"message" is not a valid JSON-formatted string: ${err.message}`
      logger.error(errMessage)
    }
  }
}

/**
 * Initializes the Kafka consumer
 * @param {SimpleConsumerOptions} kafkaConfig
 * @param {Object} consumersConfig config object, consisting of topics, handler and kafka options
 */
async function initializeKafkaClient (kafkaConfig, consumersConfig) {
  // Initialize Consumer
  try {
    consumer = new kafka.SimpleConsumer({
      ...kafkaConfig,
      logger: {
        logFunction: (...a) => {
          const logFunction = logger[_.lowerCase(a[0])]
          const logMessage = `${a[1]}: ${_.join(_.slice(a, 2), ' ')}`
          logFunction(logMessage)
        }
      }
    })
    await consumer.init()
    // Check consumer
    if (!checkConsumer(consumer)) {
      throw new Error('Broker check failed')
    }
    logger.info('kafka consumer is ready')
  } catch (err) {
    logger.error(`kafka consumer is not connected: ${err.message}`)
    return
  }
  // Subscribe to topics
  _.each(consumersConfig, (cfg) => {
    _.each(cfg.topics, (topic) => {
      logger.info('Subscribed to kafka topic:' + topic)
      consumer.subscribe(topic, cfg.options, handlerWrapper(cfg.handler))
    })
  })
}

module.exports = {
  initializeKafkaClient
}
