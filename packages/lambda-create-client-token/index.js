const middy = require('middy')
const {
  httpErrorHandler,
  httpHeaderNormalizer,
  cors
} = require('middy/middlewares')
const braintree = require('braintree')
const gateway = braintree.connect({
  environment: braintree.Environment[process.env.BT_ENVIRONMENT],
  merchantId: process.env.BT_MERCHANT_ID,
  publicKey: process.env.BT_PUBLIC_KEY,
  privateKey: process.env.BT_PRIVATE_KEY
})

const createClientToken = function (body, context, callback) {
  console.info('Creating client token')
  console.info('Args', Array.slice.call(arguments))
  gateway.clientToken.generate({}, (error, result) => {
    if (error) {
      return callback(error)
    }

    callback(null, {
      clientToken: result.clientToken
    })
  })
}

const handler = middy(createClientToken)
  .use(cors({
    origin: process.env.NODE_ENV !== 'development' ? 'https://peckham.cc' : '*'
  }))
  .use(httpHeaderNormalizer())
  .use(httpErrorHandler())

module.exports = {
  handler
}
