# Validation
- Make sure you have followed the instructions in `README.md` document for starting the services locally
 
## Test challenge creation

- I have created a test project https://connect.topcoder-dev.com/projects/22306 in dev

- For creating the test challenges in that project, please run the below command from the root of the repo
    ```
    npm run create-test-challenges;
    ```
- The above script uses the data from the `sample-data` directory for challenge creation. You are free to modify it. If needed, you can create your own test project in https://connect.topcoder-dev.com and replace the `projectId` field with the new id in `sample-data/new_challenge.json` and `sample-data/draft_challenge.json` and check.

- After running the above command, you should be able to see output similar to below. 
    ```
    2022-09-11T16:48:21.715Z [info]: Created challenge: 726a86e7-88f9-49c6-bbdf-c5a346bf942e in project: 22306 with status New
    2022-09-11T16:48:25.856Z [info]: Created challenge: c2421e4b-33ab-48b5-979c-97449d86d3fe in project: 22306 with status Draft
    2022-09-11T16:48:29.950Z [info]: Challenge id: 04705488-b6e8-4d7c-bdb4-33f8ed5572c9 Waiting for 20 seconds to allow time for legacy challenge creation before activating
    2022-09-11T16:48:51.742Z [info]: Created challenge: 04705488-b6e8-4d7c-bdb4-33f8ed5572c9 in project: 22306 with status Active
    ```
- We have created three challenges with statuses `New`, `Draft` and `Active`.

## M2M token
- Get the M2M token by running the following command after replacing `<client_id>` and `<client_secret>` with actual values.
    ```bash
    curl --request POST \
      --url https://topcoder-dev.auth0.com/oauth/token \
      --header 'content-type: application/json' \
      --data '{"client_id":"<client_id>","client_secret":"<client_secret","audience":"https://m2m.topcoder-dev.com/","grant_type":"client_credentials"}'
    ```
- Please make sure you save the `access_token` from the above output somewhere.

## Current billing account
- Go to https://connect.topcoder-dev.com/projects/22306/settings and check for the current billing account in `Choose a Billing Account` section. This will be useful in the next section.

## Sending kafka message
- Open a new terminal and execute the following command.

- Run the below command  
    ```bash
    docker exec -it tc-pbaup-kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic project.action.billingAccount.update
    ```
- You must be seeing a prompt.
- If the current billing account is `80000068`, copy the contents of the file `sample-data/sample-event-1.json` (this updates billing account `80000068` to `80000069`), or else if the current billing account is `80000069`, copy the contents of the file `sample-data/sample-event-2.json` . Make sure you copy a single line. The whole json must be in a single line.

- Enter the copied contents into the above prompt.

- Go to the terminal where the app is running.
- You should be able to see output similar to below.
```
2022-09-11T17:06:48.052Z [info]: Processing started for billing account update of project: 22306
2022-09-11T17:06:50.663Z [debug]: Challenges to process with Active status 7
2022-09-11T17:06:52.295Z [debug]: Challenges to process with Draft status 16
2022-09-11T17:06:54.034Z [debug]: Challenges to process with New status 15
2022-09-11T17:06:54.037Z [debug]: Updating challenge: 04705488-b6e8-4d7c-bdb4-33f8ed5572c9 to billingAccountId: 80000069
2022-09-11T17:06:55.975Z [debug]: Updating challenge: 0e29ec5e-a609-4ad7-b957-e55f21879839 to billingAccountId: 80000069
2022-09-11T17:06:57.788Z [debug]: Updating challenge: 4c0cdb0f-c68e-425b-b13d-784e282b0af6 to billingAccountId: 80000069
2022-09-11T17:06:59.656Z [debug]: Updating challenge: 5ba9277f-2870-4e68-a373-62efdd092b79 to billingAccountId: 80000069
2022-09-11T17:07:02.964Z [debug]: Updating challenge: 134ede13-cfcb-45b0-85b8-b6b7ac5e2799 to billingAccountId: 80000069
2022-09-11T17:07:04.925Z [debug]: Updating challenge: e07716c1-1425-422e-ac4d-a2b271739c07 to billingAccountId: 80000069
2022-09-11T17:07:07.338Z [debug]: Updating challenge: 54037019-3232-44ec-964f-61047e14224d to billingAccountId: 80000069
2022-09-11T17:07:09.371Z [debug]: Updating challenge: c2421e4b-33ab-48b5-979c-97449d86d3fe to billingAccountId: 80000069
2022-09-11T17:07:11.490Z [debug]: Updating challenge: a97b058a-3fe2-49e6-ad63-c9e725f72cb1 to billingAccountId: 80000069
2022-09-11T17:07:13.276Z [debug]: Updating challenge: c4491fee-a9ac-419d-ad52-598bbbdd10a7 to billingAccountId: 80000069
2022-09-11T17:07:15.534Z [debug]: Updating challenge: 47b783b7-01ba-44e0-a270-8b4dc5bbd893 to billingAccountId: 80000069
2022-09-11T17:07:17.588Z [debug]: Updating challenge: 4bf35815-d147-4c0a-902d-bd0d8a8102eb to billingAccountId: 80000069
2022-09-11T17:07:19.625Z [debug]: Updating challenge: 890d08d3-543c-4eed-a188-ef4eab396996 to billingAccountId: 80000069
2022-09-11T17:07:21.925Z [debug]: Updating challenge: 02dcbe48-2065-43de-be53-d1fac226c325 to billingAccountId: 80000069
2022-09-11T17:07:23.737Z [debug]: Updating challenge: aa0f8e17-1d19-4285-b6f0-cd103ec00821 to billingAccountId: 80000069
2022-09-11T17:07:27.817Z [debug]: Updating challenge: 14901b74-9e99-43b8-a726-1200d4ec478c to billingAccountId: 80000069
2022-09-11T17:07:29.560Z [debug]: Updating challenge: 754026f2-fbf9-4d12-9e5a-75650f18e47d to billingAccountId: 80000069
2022-09-11T17:07:31.503Z [debug]: Updating challenge: 053c0a8c-0175-465d-8ee1-153297deb46c to billingAccountId: 80000069
2022-09-11T17:07:33.368Z [debug]: Updating challenge: 32f7edb8-b76d-43d1-8220-0819b8ddb923 to billingAccountId: 80000069
2022-09-11T17:07:34.985Z [debug]: Updating challenge: c32fbb9d-6c66-4a7a-95c6-f9ecf8309017 to billingAccountId: 80000069
2022-09-11T17:07:36.957Z [debug]: Updating challenge: a46d9868-27ea-4cb8-866b-ef4d3869fb80 to billingAccountId: 80000069
2022-09-11T17:07:38.545Z [debug]: Updating challenge: 9558cefd-6714-4d34-bd4d-34156f9c9b24 to billingAccountId: 80000069
2022-09-11T17:07:40.105Z [debug]: Updating challenge: 26078eab-ed70-436a-9756-cfa7b64dd5a7 to billingAccountId: 80000069
2022-09-11T17:07:42.014Z [debug]: Updating challenge: 726a86e7-88f9-49c6-bbdf-c5a346bf942e to billingAccountId: 80000069
2022-09-11T17:07:43.797Z [debug]: Updating challenge: a971dc23-d086-4579-9385-d02d41b251b3 to billingAccountId: 80000069
2022-09-11T17:07:45.819Z [debug]: Updating challenge: 0a6db4a7-55c9-4775-b9ef-8dd1f10df680 to billingAccountId: 80000069
2022-09-11T17:07:47.368Z [debug]: Updating challenge: 446058be-fee7-4e14-80bf-cfb6babfa46c to billingAccountId: 80000069
2022-09-11T17:07:48.911Z [debug]: Updating challenge: c99e7cbc-cd17-449e-95da-ed0aa500b211 to billingAccountId: 80000069
2022-09-11T17:07:50.959Z [debug]: Updating challenge: 7210266e-e0a6-4c79-8ebf-7782a8fc87b1 to billingAccountId: 80000069
2022-09-11T17:07:52.803Z [debug]: Updating challenge: 72a277f9-a69c-4f6f-a2f1-15ca52822400 to billingAccountId: 80000069
2022-09-11T17:07:54.441Z [debug]: Updating challenge: ba87756f-62ef-43a5-bcd3-80bfd86ac1a0 to billingAccountId: 80000069
2022-09-11T17:07:56.397Z [debug]: Updating challenge: 1d0cbf73-12f7-4d58-b45c-7b0699a9dfdb to billingAccountId: 80000069
2022-09-11T17:07:57.814Z [debug]: Updating challenge: a86f5ea5-c5da-4cdd-8f23-75e42892cfd6 to billingAccountId: 80000069
2022-09-11T17:07:59.561Z [debug]: Updating challenge: 0a1a38af-8ea5-4dc0-a772-4083ed2b4661 to billingAccountId: 80000069
2022-09-11T17:08:01.609Z [debug]: Updating challenge: d296eaf6-0e30-4fd3-b04e-0ea884dc885c to billingAccountId: 80000069
2022-09-11T17:08:03.580Z [debug]: Updating challenge: edc08d70-a4b9-4fe7-ac8f-21808c857ddd to billingAccountId: 80000069
2022-09-11T17:08:05.743Z [debug]: Updating challenge: 18e13d1a-2f44-4bfa-a420-d30995a1ac22 to billingAccountId: 80000069
2022-09-11T17:08:07.752Z [debug]: Updating challenge: 02712458-513c-468a-add3-bac463ee8ec1 to billingAccountId: 80000069
2022-09-11T17:08:09.706Z [info]: Processing complete for billing account update of project: 22306

```
- We can see that all the `Draft`, `New` and `Active` challenges in the project are updated.
- To confirm whether the billing account is updated or not, you can execute the below command by replacing `726a86e7-88f9-49c6-bbdf-c5a346bf942e` with your own challenge id to verify and by replacing `<token>` with the M2M token generated in the previous section.
    ```
    curl --location --request GET 'https://api.topcoder-dev.com/v5/challenges/726a86e7-88f9-49c6-bbdf-c5a346bf942e' \
    --header 'Authorization: Bearer <token>'
    ```
- The output should be similar to below.
   ```
  {
      "id": "726a86e7-88f9-49c6-bbdf-c5a346bf942e",
      "created": "2022-09-11T16:48:21.209Z",
      "createdBy": "tcwebservice",
      "updated": "2022-09-11T17:07:43.463Z",
      "updatedBy": "tcwebservice",
      "status": "New",
      "projectId": 22306,
      "name": "test dr billing new challenge",
      "typeId": "927abff4-7af9-4145-8ba1-577c16e64e2e",
      "trackId": "9b6fc876-f4d9-4ccb-9dfd-419247628825",
      "startDate": "2022-09-12T12:24:56.000Z",
      "legacy": {
          "reviewType": "COMMUNITY",
          "confidentialityType": "public"
      },
      "descriptionFormat": "markdown",
      "timelineTemplateId": "7ebf1c69-f62f-4d3a-bdfb-fe9ddb56861c",
      "terms": [
          {
              "roleId": "732339e7-8e30-49d7-9198-cccf9451e221",
              "id": "317cd8f9-d66c-4f2a-8774-63c612d99cd4"
          }
      ],
      "groups": [],
      "tags": [],
      "discussions": [
          {
              "provider": "vanilla",
              "name": "test dr billing Discussion",
              "id": "ad4103e0-cb92-4659-b156-19a40efd8a80",
              "type": "challenge"
          }
      ],
      "description": "",
      "billing": {
          "billingAccountId": "80000069",
          "markup": 0.5
      },
      "phases": [
          {
              "duration": 432000,
              "scheduledEndDate": "2022-09-17T12:24:56.000Z",
              "isOpen": false,
              "phaseId": "a93544bc-c165-4af4-b55e-18f3593b457a",
              "name": "Registration",
              "actualStartDate": "2022-09-12T12:24:56.000Z",
              "description": "Registration Phase",
              "id": "4d6114f0-1f07-4a08-a855-d22b7ec58869",
              "scheduledStartDate": "2022-09-12T12:24:56.000Z"
          },
          {
              "duration": 432000,
              "scheduledEndDate": "2022-09-17T12:24:56.000Z",
              "isOpen": false,
              "phaseId": "6950164f-3c5e-4bdc-abc8-22aaf5a1bd49",
              "name": "Submission",
              "actualStartDate": "2022-09-12T12:24:56.000Z",
              "description": "Submission Phase",
              "id": "30ca52ea-1194-45f0-8d2e-8b79906ec39b",
              "scheduledStartDate": "2022-09-12T12:24:56.000Z"
          },
          {
              "duration": 172800,
              "scheduledEndDate": "2022-09-19T12:24:56.000Z",
              "isOpen": false,
              "phaseId": "aa5a3f78-79e0-4bf7-93ff-b11e8f5b398b",
              "name": "Review",
              "actualStartDate": "2022-09-17T12:24:56.000Z",
              "description": "Review Phase",
              "id": "f7f2248a-dc4a-4e11-9f6f-ea6ff5a3c783",
              "predecessor": "6950164f-3c5e-4bdc-abc8-22aaf5a1bd49",
              "scheduledStartDate": "2022-09-17T12:24:56.000Z"
          },
          {
              "duration": 86400,
              "scheduledEndDate": "2022-09-20T12:24:56.000Z",
              "isOpen": false,
              "phaseId": "1c24cfb3-5b0a-4dbd-b6bd-4b0dff5349c6",
              "name": "Appeals",
              "actualStartDate": "2022-09-19T12:24:56.000Z",
              "description": "Appeals Phase",
              "id": "0d2399a7-6b2a-4971-8ec8-e0b94c9fa9f6",
              "predecessor": "aa5a3f78-79e0-4bf7-93ff-b11e8f5b398b",
              "scheduledStartDate": "2022-09-19T12:24:56.000Z"
          },
          {
              "duration": 43200,
              "scheduledEndDate": "2022-09-21T00:24:56.000Z",
              "isOpen": false,
              "phaseId": "797a6af7-cd3f-4436-9fca-9679f773bee9",
              "name": "Appeals Response",
              "actualStartDate": "2022-09-20T12:24:56.000Z",
              "description": "Appeals Response Phase",
              "id": "925ca79a-7946-4757-91e0-759b8b396ad2",
              "predecessor": "1c24cfb3-5b0a-4dbd-b6bd-4b0dff5349c6",
              "scheduledStartDate": "2022-09-20T12:24:56.000Z"
          }
      ],
      "endDate": "2022-09-21T00:24:56.000Z",
      "numOfSubmissions": 0,
      "numOfRegistrants": 0,
      "currentPhaseNames": [],
      "registrationStartDate": "2022-09-12T12:24:56.000Z",
      "registrationEndDate": "2022-09-17T12:24:56.000Z",
      "submissionStartDate": "2022-09-12T12:24:56.000Z",
      "submissionEndDate": "2022-09-17T12:24:56.000Z",
      "track": "Development",
      "type": "Challenge"
  }
   ```
- We can see that the `billing.billingAccountId` in the above json is `80000069`. Thus we have succesfully verified that the billing account is updated.
- You can make the same verification for other challenge ids as well.
- You can also check the video https://drive.google.com/file/d/1Rg3MopTDz7uI3gtHS1liIhqWRarCXsEv/view?usp=sharing for the above verification. (Please download the video for better quality.)


## Verification of sequential processing

- The app also handles sequential processing of events i.e when one event is processing, even if the other event comes, it handles the second event only *AFTER THE FIRST EVENT IS PROCESSED COMPLETELY*.

- To verify this, you can send two events one after the other.

- Run the below command
    ```bash
    docker exec -it tc-pbaup-kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic project.action.billingAccount.update
    ```
- Copy the contents of `sample-event-1.json` and enter into the prompt above and then copy the contents of `sample-event-2.json` and enter into the prompt above. This order should be reversed if the current billing account is 60000069.

- Go to the terminal and verify the output of the app.

- You should see that only *after* the first event is completely processed i.e all the billing accounts are updated to `60000069`, only then second event is processed and billing accounts are updated back to `60000068`. 
   
- You can also check the video at https://drive.google.com/file/d/1TND9d6T9-lvklVcjIEaAuHRos4aH9hgr/view?usp=sharing for verification of sequential processing. (Please download the video for better quality.)

## Further testing

- I have made sure that *all* the challenges are fetched by continuously fetching challenges until there is no next page. You can verify that as well. Project id `22262` should be good for that testing because there are more than `20` (i.e the default pageSize) challenges in that project for few of the challenge statuses. 

- I have also made sure that if any of the challenge update fails, next challenge continues processing by wrapping each challenge update in try-catch block and logging the error.
