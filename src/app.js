const config = require('config')
const { kafkaModules } = require('./modules')
const { initializeKafkaClient } = require('./utils/kafka.util')

/**
 * Start the processor
 */
async function bootstrap () {
  await initializeKafkaClient(config.KAFKA, kafkaModules)
}

bootstrap()
