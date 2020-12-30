const middy = require('middy')
const httpErrors = require('http-errors')
const {
  cors
} = require('middy/middlewares')
const {
  errorHandler
} = require('./middleware')
const {
  getUserIdForCustomerId,
  updateUser,
  getUser
} = require('./account')
const {
  getPaymentDigits,
  updateFopccPaymentMethod,
  verifyWebhookEvent
} = require('./stripe-client')

async function handleCheckoutComplete (context, event) {
  const { data: { object: { mode } } } = event
  console.info('Handling checkout mode', mode)

  if (mode === 'subscription') {
    // we are setting up a FoPCC Subscription
    await handleNewFoPCCSubscription(context, event)
  } else if (mode === 'setup') {
    // updating a FoPCC subscription
    await updateFoPCCSubscription(context, event)
  } else {
    // a regular shop transaction
  }
}

async function handleNewFoPCCSubscription ({ userId, user }, { data: { object } }) {
  console.info('Handling new FoPCC subscription', object.subscription)

  const subscriptionId = object.subscription

  if (!subscriptionId) {
    throw new httpErrors.BadRequest('No subscription id found in webhook event')
  }

  if (user.fopcc.subscriptionId) {
    throw new httpErrors.BadRequest('User already has a subscription')
  }

  console.info('Marking subscription', subscriptionId, 'for user', userId, 'pending-payment')

  // we are awaiting first payment
  await updateUser(userId, {
    fopcc: {
      subscriptionId,
      status: 'pending-payment'
    }
  })
}

async function updateFoPCCSubscription ({ userId, user }, { data: { object } }) {
  console.info('Handling updated FoPCC subscription', object.subscription)

  const subscriptionId = object.subscription

  if (!subscriptionId) {
    throw new httpErrors.BadRequest('No subscription id found in webhook event')
  }

  if (!user.fopcc.subscriptionId) {
    throw new httpErrors.BadRequest('User had no existing subscription')
  }

  if (subscriptionId !== user.fopcc.subscriptionId) {
    throw new httpErrors.BadRequest('Subscription ID was incorrect')
  }

  // already had a membership, update the payment method
  const setupIntent = object.setup_intent

  if (!setupIntent) {
    throw new httpErrors.BadRequest('No setup intent found')
  }

  console.info('Updating payment information for subscription', user.fopcc.subscriptionId, 'for user', userId)

  await updateFopccPaymentMethod(
    user.stripeCustomerId,
    user.fopcc.subscriptionId,
    setupIntent
  )
}

async function handleInvoicePaid (context, event) {
  const { data: { object } } = event

  if (object.subscription) {
    await handleFoPCCPayment(context, event)
  }
}

async function handleFoPCCPayment ({ userId, user }, { data: { object } }) {
  if (object.subscription !== user.fopcc.subscriptionId) {
    throw new httpErrors.BadRequest('Subscription ID was incorrect')
  }

  const lineItems = object.lines && object.lines.data

  if (!Array.isArray(lineItems)) {
    throw new httpErrors.BadRequest('Line items were not an array')
  }

  if (lineItems.length !== 1) {
    throw new httpErrors.BadRequest('Too many line items found')
  }

  const subscription = lineItems[0]
  const renews = subscription.period && subscription.period.end

  if (!renews) {
    throw new httpErrors.BadRequest('No subscription renewal date found')
  }

  const charge = object.charge

  if (!charge) {
    throw new httpErrors.BadRequest('No charge found')
  }

  const last4 = await getPaymentDigits(charge)

  if (!last4) {
    throw new httpErrors.BadRequest('No last4 found')
  }

  const invoice = object.invoice_pdf

  if (!invoice) {
    throw new httpErrors.BadRequest('No invoice found')
  }

  const amount = object.amount_paid

  if (!amount) {
    throw new httpErrors.BadRequest('No amount found')
  }

  const invoices = user.fopcc.invoices || []

  invoices.push({
    date: Date.now(),
    amount,
    invoice
  })

  console.info('Marking subscription', object.subscription, 'for user', userId, 'active')

  await updateUser(userId, {
    fopcc: {
      ...user.fopcc,
      status: 'active',
      renews: renews * 1000,
      last4,
      invoices
    }
  })
}

async function handleInvoicePaymentFailure (context, event) {
  const { data: { object } } = event

  if (object.subscription) {
    await handleFoPCCPaymentFailure(context, event)
  }
}

async function handleFoPCCPaymentFailure ({ userId, user }, { data: { object } }) {
  if (object.subscription !== user.fopcc.subscriptionId) {
    throw new httpErrors.BadRequest('Subscription ID was incorrect')
  }

  console.info('Marking subscription', object.subscription, 'for user', userId, 'payment-failed')

  await updateUser(userId, {
    fopcc: {
      ...user.fopcc,
      status: 'payment-failed'
    }
  })
}

async function handleFoPCCCancellation ({ userId, user }, { data: { object } }) {
  if (object.id !== user.fopcc.subscriptionId) {
    throw new httpErrors.BadRequest('Subscription ID was incorrect')
  }

  console.info('Marking subscription', object.id, 'for user', userId, 'cancelled')

  await updateUser(userId, {
    fopcc: {
      ...user.fopcc,
      status: 'cancelled',
      subscriptionId: undefined
    }
  })
}

async function fopccWebhook ({ body, headers }) {
  const event = verifyWebhookEvent(body, headers['Stripe-Signature'])

  console.info('event', JSON.stringify(event, null, 2))

  const type = event.type

  if (!type) {
    throw new httpErrors.BadRequest('No type found in webhook event')
  }

  const object = event.data && event.data.object

  if (!object) {
    throw new httpErrors.BadRequest('No object found in webhook event')
  }

  const customerId = object.customer

  if (!customerId) {
    throw new httpErrors.BadRequest('No customer id found in webhook event')
  }

  const userId = await getUserIdForCustomerId(customerId)

  if (!userId) {
    throw new httpErrors.BadRequest('No user id found for customer id')
  }

  const user = await getUser(userId)

  if (!user) {
    throw new httpErrors.BadRequest('No user found for user id')
  }

  const context = {
    userId,
    user,
    customerId
  }

  if (type === 'checkout.session.completed') {
    await handleCheckoutComplete(context, event)
  } else if (type === 'invoice.paid') {
    await handleInvoicePaid(context, event)
  } else if (type === 'invoice.payment_failed') {
    await handleInvoicePaymentFailure(context, event)
  } else if (type === 'customer.subscription.deleted') {
    await handleFoPCCCancellation(context, event)
  } else {
    throw new httpErrors.BadRequest('Unexpected type found in webhook event')
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  }
}

module.exports = {
  handler: middy(fopccWebhook)
    .use(errorHandler())
    .use(cors({
      origin: process.env.NODE_ENV !== 'development' ? 'https://peckham.cc' : '*'
    }))
}
