require("dotenv").config();

module.exports = {
  LOGGER: {
    DISABLE_LOGGING: Boolean(process.env.DISABLE_LOGGING === "true"),
    LOG_LEVEL: process.env.LOG_LEVEL || "debug",
  },
  KAFKA: {
    connectionString: process.env.KAFKA_URL || "localhost:9092",
  },
  CHALLENGE_API_URL: process.env.CHALLENGE_API || "https://api.topcoder-dev.com/v5/challenges",
  AUTH: {
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
    AUTH0_URL: process.env.AUTH0_URL,
    TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME,
    AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,
  },
}
