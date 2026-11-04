import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { it } from 'node:test'

import { createHealthServer } from '../../src/health/health.service.js'

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
