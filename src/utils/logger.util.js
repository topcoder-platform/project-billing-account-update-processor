const config = require('config')
const winston = require('winston')
const winstonTimestampColorize = require('winston-timestamp-colorize')

// Setting up the winston logger for the app
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.timestamp(),
    winstonTimestampColorize(),
    winston.format.printf(info => {
      return `${info.timestamp} [${info.level}]: ${info.message}`
    })
  ),
  silent: config.LOGGER.DISABLE_LOGGING,
  level: config.LOGGER.LOG_LEVEL,
  transports: [new winston.transports.Console()]
})

module.exports = logger
