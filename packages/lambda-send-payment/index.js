const middy = require('middy')
const {
  jsonBodyParser,
  validator,
  httpErrorHandler,
  httpHeaderNormalizer,
  cors
} = require('middy/middlewares')
const {
  config
} = require('./config')
const {
  capitalise
} = require('./utils')
const sendEmail = require('./send-email')
// const makePayment = require('./make-payment')

const toCurrencyString = (amount) => {
  const asString = amount.toString()

  return `${asString.substring(0, asString.length - 2)}.${asString.substring(asString.length - 2)}`
}

const sendPayment = function (event, _, callback) {
  const {
    items,
    firstName,
    lastName,
    email,
    address1,
    address2,
    address3,
    postCode,
    shopCode
  } = event.body

  if (shopCode !== process.env.PCC_SHOP_CODE) {
    return callback(null, {
      statusCode: 400,
      body: {
        message: 'Invalid shop code'
      }
    })
  }

  if (!items.length) {
    return callback(null, {
      statusCode: 400,
      body: {
        message: 'Empty cart'
      }
    })
  }

  let amount = 0

  // What did they order
  const lineItems = items.map(item => {
    const lineItem = config.store.products.find(lineItem => lineItem.sku === item.sku)

    // Work out total cost of items
    amount += (lineItem.price * item.quantity)

    return {
      kind: 'debit',
      name: item.sku,
      quantity: item.quantity,
      totalAmount: toCurrencyString(lineItem.price * item.quantity),
      unitAmount: toCurrencyString(lineItem.price),
      // 127 char limit
      description: [item.gender && `Gender: ${item.gender.name}`, item.size && `Size: ${item.size.name}`]
        .concat(item.variants
          ? Object.keys(item.variants)
            .map(variant =>
              `${capitalise(variant)}: ${item.variants[variant].name}`) : [])
        .filter(Boolean)
        .join(', ')
        .trim()
    }
  })

  amount = toCurrencyString(amount)

  sendEmail(email, firstName, lastName, address1, address2, address3, postCode, lineItems, amount, (error, results) => {
    let statusCode = 200
    let responseBody = {}

    if (error) {
      console.error(error)
      statusCode = 500
    }

    callback(null, {
      statusCode,
      body: responseBody
    })
  })
}

const inputSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sku: { type: 'string', pattern: '.+' },
              title: { type: 'string', pattern: '.+' },
              quantity: { type: 'number', exclusiveMinimum: 0 },
              size: {
                type: 'object',
                properties: {
                  code: { type: 'string', pattern: '.+' },
                  name: { type: 'string', pattern: '.+' }
                }
              },
              gender: {
                type: 'object',
                properties: {
                  code: { type: 'string', pattern: '.+' },
                  name: { type: 'string', pattern: '.+' }
                }
              },
              variants: {
                type: 'object'
              },
              id: { type: 'string', pattern: '.+' }
            },
            required: ['sku', 'title', 'quantity']
          }
        },
        nonce: { type: 'string', pattern: '.+' },
        firstName: { type: 'string', pattern: '.+' },
        lastName: { type: 'string', pattern: '.+' },
        email: { type: 'string', pattern: '.+' }
      },
      required: ['items', 'nonce', 'firstName', 'lastName', 'email', 'address1', 'postCode', 'shopCode']
    }
  }
}

const handler = middy(sendPayment)
  .use(cors({
    origin: process.env.NODE_ENV !== 'development' ? 'https://peckham.cc' : '*'
  }))
  .use(httpHeaderNormalizer())
  .use(jsonBodyParser())
  .use(validator({inputSchema}))
  .use(httpErrorHandler())

module.exports = {
  handler
}
