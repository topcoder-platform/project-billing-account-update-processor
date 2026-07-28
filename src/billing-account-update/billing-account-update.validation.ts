import Joi from 'joi'

import type { BillingAccountUpdate } from './billing-account-update.types.js'

const billingAccountIdSchema = Joi.alternatives().try(
  Joi.string(),
  Joi.number(),
)

const billingAccountUpdateSchema = Joi.object<BillingAccountUpdate>({
  projectId: Joi.number().required(),
  projectName: Joi.string(),
  directProjectId: Joi.number().allow(null),
  status: Joi.string(),
  oldBillingAccountId: billingAccountIdSchema,
  newBillingAccountId: billingAccountIdSchema.required(),
}).unknown(true)

export class InvalidBillingAccountUpdateError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'InvalidBillingAccountUpdateError'
  }
}

export function parseBillingAccountUpdate(
  input: unknown,
): BillingAccountUpdate {
  const { error, value } = billingAccountUpdateSchema.validate(input, {
    abortEarly: false,
  })

  if (error) {
    throw new InvalidBillingAccountUpdateError(
      `Invalid billing account update payload: ${error.message}`,
      { cause: error },
    )
  }

  return value
}
