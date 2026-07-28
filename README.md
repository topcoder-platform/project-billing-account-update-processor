# Project Billing Account Update Processor

## Description

This NestJS and TypeScript worker consumes the
`project.action.billingAccount.update` Kafka event and updates challenges in the
affected project to use its new billing account.

Challenges in the `Active`, `Draft`, and `New` statuses are updated. The
project API publishes the event when a project's billing account changes in
Connect. This service relates to
[PLAT-1233](https://topcoder.atlassian.net/browse/PLAT-1233).

Kafka integration is provided by `@platformatic/kafka`. Messages are processed
sequentially and their offsets are committed after processing completes.

## Requirements

- [Node.js 22.22.0 or newer in the Node 22 release line](https://nodejs.org/en/)
- [Apache Kafka](https://kafka.apache.org/) 3.5 through 4.2
- Docker with Docker Compose 2.24 or newer for the container workflow

The local Compose environment pins Apache Kafka 3.9.1 in KRaft mode.

## Local development

Copy the sample environment file and provide the Auth0 values required to call
the Challenge API:

```bash
cp sample.env .env
```

### Configuration

| Name | Description | Default value |
| ---- | ----------- | ------------- |
| `DISABLE_LOGGING` | Disable application logging | `false` |
| `LOG_LEVEL` | Application log level | `debug` |
| `KAFKA_URL` | Comma-delimited Kafka bootstrap brokers | `localhost:9092` |
| `KAFKA_CLIENT_ID` | Kafka client identifier | `project-billing-account-update-processor` |
| `KAFKA_GROUP_ID` | Stable Kafka consumer group identifier | `project-billing-account-update-processor` |
| `KAFKA_TOPIC` | Kafka topic consumed by the worker | `project.action.billingAccount.update` |
| `KAFKA_FROM_BEGINNING` | Use the earliest offset when the consumer group has no committed offset | `false` |
| `KAFKA_SESSION_TIMEOUT_MS` | Consumer session timeout in milliseconds | `60000` |
| `KAFKA_HEARTBEAT_INTERVAL_MS` | Consumer heartbeat interval in milliseconds | `3000` |
| `KAFKA_HIGH_WATER_MARK` | Maximum number of messages buffered by the consumer stream | `1` |
| `KAFKA_RECONNECT_DELAY_MS` | Delay before recreating a terminal consumer stream, in milliseconds | `5000` |
| `KAFKA_AUTOCREATE_TOPICS` | Allow the client to create missing topics | `false` |
| `AUTH0_URL` | Topcoder Auth0 URL | Required |
| `AUTH0_AUDIENCE` | Topcoder Auth0 audience | Required |
| `AUTH0_CLIENT_ID` | Topcoder Auth0 client ID | Required |
| `AUTH0_CLIENT_SECRET` | Topcoder Auth0 client secret | Required |
| `AUTH0_PROXY_SERVER_URL` | Optional Topcoder Auth0 proxy URL | Empty |
| `CHALLENGE_API_URL` | Challenge API base URL | `https://api.topcoder-dev.com/v6/challenges` |

Keep `KAFKA_GROUP_ID` stable between deployments so the worker resumes from its
committed offsets. With `KAFKA_FROM_BEGINNING=false`, a new consumer group
starts from messages published after it connects.

Malformed JSON and payloads that fail schema validation are logged and committed
so they cannot poison a partition. Transient processing failures are not
committed: the stream is recreated and the event is retried from the group's
last committed offset. Individual challenge PATCH failures are logged while the
remaining challenges continue processing.

### Start Kafka

Start the pinned single-node Kafka broker. The Compose project also creates the
`project.action.billingAccount.update` topic with one partition:

```bash
docker compose -f docker/kafka/docker-compose.yml up -d
```

Check broker health and list its topics:

```bash
docker compose -f docker/kafka/docker-compose.yml ps
docker exec tc-pbaup-kafka \
  /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server kafka:19092 \
  --list
```

The topic list should include `project.action.billingAccount.update`.

### Start the application on the host

Use the repository's pinned Node release when possible, then install the locked
dependency graph:

```bash
nvm use
npm ci
```

Run the worker with TypeScript watch mode:

```bash
npm run start:dev
```

For a production-style local run, compile and start the generated JavaScript:

```bash
npm run build
npm start
```

### Start the application with Docker

Start Kafka first so that it creates the shared `tc-pbaup-network`, then build
and run the worker:

```bash
docker compose -f docker/kafka/docker-compose.yml up -d
docker compose -f docker/docker-compose.yml up --build
```

The application container uses Kafka's internal `kafka:19092` listener. Host
processes use `localhost:9092`.

To stop the local services:

```bash
docker compose -f docker/docker-compose.yml down
docker compose -f docker/kafka/docker-compose.yml down
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Use `npm run lint:fix` to apply supported automatic lint fixes.

## Validation

See [Validation.md](Validation.md) for the manual end-to-end validation flow.
That flow updates real challenges in the Topcoder development environment, so
use a dedicated test project and credentials.
