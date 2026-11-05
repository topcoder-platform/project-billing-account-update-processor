import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { it } from 'node:test'

import {
  createHealthServer,
  HealthService,
} from '../../src/health/health.service.js'
import type { KafkaConsumerService } from '../../src/kafka/kafka-consumer.service.js'

void it('fails health checks during startup and loss of the processing stream', async () => {
  let ready = false
  const server = createHealthServer(() => ready)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address() as AddressInfo
  const endpoint = `http://127.0.0.1:${String(port)}`
  try {
    assert.equal((await fetch(endpoint + '/health')).status, 503)
    ready = true
    assert.equal((await fetch(endpoint + '/health')).status, 200)
    ready = false
    assert.equal((await fetch(endpoint + '/health')).status, 503)
    assert.equal((await fetch(endpoint + '/other')).status, 404)
  } finally {
    server.close()
    await once(server, 'close')
  }
})

void it('runs the committed ECS probes against the worker readiness listener', async () => {
  let ready = false
  const service = new HealthService({
    isReady: () => ready,
  } as KafkaConsumerService)
  await service.onApplicationBootstrap()
  try {
    for (const environment of ['dev', 'prod']) {
      const checks = JSON.parse(
        readFileSync(
          new URL(
            `../../deploy/${environment}-healthcheck.json`,
            import.meta.url,
          ),
          'utf8',
        ),
      ) as Record<string, { command: string[] }>
      const [mode, executable, ...args] =
        checks['project-billing-account-update-processor']!.command
      assert.equal(mode, 'CMD')
      assert.ok(executable)
      const probe = () =>
        new Promise<number | null>((resolve, reject) => {
          const child = spawn(executable, args, { stdio: 'ignore' })
          child.once('error', reject)
          child.once('close', resolve)
        })
      ready = false
      assert.equal(
        await probe(),
        1,
        `${environment}: startup must fail readiness`,
      )
      ready = true
      assert.equal(
        await probe(),
        0,
        `${environment}: active worker must pass readiness`,
      )
      ready = false
      assert.equal(
        await probe(),
        1,
        `${environment}: disconnected worker must fail readiness`,
      )
    }
  } finally {
    await service.onApplicationShutdown()
  }
})
