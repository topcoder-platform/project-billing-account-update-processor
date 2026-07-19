# Validation

This flow changes real resources in the Topcoder development environment. Use
a dedicated test project and development-only credentials.

## Prerequisites

1. Complete the local setup in [README.md](README.md), including `.env`, Kafka,
   and the worker.
2. Create or choose a dedicated project in Topcoder Connect.
3. Replace `projectId` in these files with that project's ID:

   - `sample-data/new_challenge.json`
   - `sample-data/draft_challenge.json`
   - `sample-data/sample-event-1.json`
   - `sample-data/sample-event-2.json`

4. Update the old and new billing account IDs in both sample events to match
   billing accounts available to the test project.

## Create test challenges

Run:

```bash
npm run create-test-challenges
```

The TypeScript helper creates `New`, `Draft`, and `Active` challenges. It
overrides the dated sample `startDate` values with a time 24 hours in the
future, so the checked-in 2022 fixtures do not make challenge creation fail.
It waits 20 seconds before activating the final challenge to allow legacy
challenge creation to complete.

Record the three challenge IDs printed by the script.

## Send a billing-account event

Open a Kafka producer:

```bash
docker exec -it tc-pbaup-kafka \
  /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server kafka:19092 \
  --topic project.action.billingAccount.update
```

Paste one complete line from the appropriate `sample-data/sample-event-*.json`
file. Choose the event whose `oldBillingAccountId` matches the project's current
billing account.

The worker should log, in order:

1. the Kafka topic, partition, and offset;
2. processing start for the project and new billing account;
3. challenge counts for `Active`, `Draft`, and `New`;
4. each update or skip decision;
5. processing completion.

The consumer commits the Kafka offset only after processing completes.

## Verify the Challenge API result

Obtain a development M2M token:

```bash
curl --request POST \
  --url https://topcoder-dev.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{"client_id":"<client_id>","client_secret":"<client_secret>","audience":"https://m2m.topcoder-dev.com/","grant_type":"client_credentials"}'
```

For each recorded challenge ID, run:

```bash
curl --location \
  'https://api.topcoder-dev.com/v6/challenges/<challenge_id>' \
  --header 'Authorization: Bearer <token>'
```

Confirm that `billing.billingAccountId` equals the event's
`newBillingAccountId` and `billing.markup` is unchanged.

## Verify sequential processing

Using the same console producer, paste both sample events one after the other.
Order them so the second event's `oldBillingAccountId` matches the first event's
`newBillingAccountId`.

Confirm from the worker logs that the second event starts only after the first
event completes. Challenge PATCH operations within each event should also
appear sequentially.

To inspect the committed offset and lag, run:

```bash
docker exec tc-pbaup-kafka \
  /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server kafka:19092 \
  --group project-billing-account-update-processor \
  --describe
```

After both events complete, the topic partition should have zero lag.

## Automated regression checks

Run the complete local quality gate:

```bash
npm run check
```

The tests cover pagination, normalized string/number billing IDs, markup
preservation, missing billing data, continuation after an individual PATCH
failure, global sequential Kafka processing, invalid-message commits, retry
from the committed offset, configuration, and M2M authentication caching.
