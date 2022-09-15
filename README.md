#  Topcoder v5 Project Billing Account Update processor

## Description

This is a Node app that runs as a processor, watching a kafka queue for the `project.action.billingAccount.update` event and updates the challenges in the project to the new billing account.

The processor will update any challenges that are in active, draft, or new statuses to use the billing account set in Connect.

The project-api raises the event when the billing account is updated for a given project.

This is in relation to: https://topcoder.atlassian.net/browse/PLAT-1233

## Requirements

- [Node 16+](https://nodejs.org/en/)
- [Kafka](https://kafka.apache.org/)


## Local Development
Install Docker.

### Configuration

- Rename the `sample.env` to `.env` and set the values for the config.

Below is the description for different variables in config.

| Name | Description | Default value |
| ---- | ----------- | ------------- |
| DISABLE_LOGGING | Whether to disable logging | `false` |
| LOG_LEVEL | Logging level | `debug` |
| KAFKA_URL | Kafka connection string | `localhost:9092` |
| AUTH0_URL | Topcoder Auth0 URL | |
| AUTH0_AUDIENCE | Topcoder Auth0 Audience | |
| AUTH0_CLIENT_ID | Topcoder Auth0 client ID | |
| AUTH0_CLIENT_SECRET | Topcoder Auth0 Client Secret | |
| AUTH0_PROXY_SERVER_URL | Topcoder Auth0 Proxy Server URL |  |
| TOKEN_CACHE_TIME | Token cache time |  |
| CHALLENGE_API_URL | Challenge API URL | `https://api.topcoder-dev.com/v5/challenges` |


### Starting kafka and zookeeper.
- From the repo root directory, run the following command.
    ```
    docker-compose -f docker/kafka/docker-compose.yml up
    ```
  
- Go to another terminal and make sure `kafka` and `zookeeper` services have started by running `docker ps`.

- To verify that the topic `project.action.billingAccount.update` is created, run the following command

    ```
    docker exec tc-pbaup-kafka /opt/kafka/bin/kafka-topics.sh --list --zookeeper zookeeper:2181
    ```
- You should see the output topic listed `project.action.billingAccount.update`

### Starting app locally

- Make sure you're on node version 16+

- Go to the repo root directory and run 
    ```
    npm install
    ```
- After the dependencies are installed, 
    - run `npm run start:dev` to start in development mode or
    - run `npm start` to start in normal mode.
- You should be able to see messages similar to the below
    ```
    2022-09-11T16:26:07.143Z [info]: kafka consumer is ready
    2022-09-11T16:26:07.145Z [info]: Subscribed to kafka topic:project.action.billingAccount.update
    2022-09-11T16:26:07.169Z [debug]: no-kafka-client: Subscribed to project.action.billingAccount.update:0 offset 0 leader localhost:9092
    ```
    
### Starting app with docker

- From the root of the repo, run the command
  ```
  docker-compose -f docker/docker-compose.yml up --build
  ```


## Linting

```bash
# lint without fixing
$ npm run lint

# lint and auto-fix
$ npm run lint:fix
```

## Validation
- Please check the instructions in `Validation.md` for validating the processor.
