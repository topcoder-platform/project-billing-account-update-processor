import type { KafkaEventEnvelope } from '../billing-account-update/billing-account-update.types.js'

export class InvalidKafkaEventError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'InvalidKafkaEventError'
  }
}

export function parseKafkaEvent(value: Buffer | undefined): KafkaEventEnvelope {
  if (value === undefined) {
    throw new InvalidKafkaEventError('Kafka message value is empty')
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(value.toString('utf8')) as unknown
  } catch (error) {
    throw new InvalidKafkaEventError('Kafka message value is not valid JSON', {
      cause: error,
    })
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Object.hasOwn(parsed, 'payload')
  ) {
    throw new InvalidKafkaEventError(
      'Kafka message must be an event envelope containing a payload',
    )
  }

  return parsed as KafkaEventEnvelope
}
