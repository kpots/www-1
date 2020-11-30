const middy = require('middy')
const { HttpError } = require('http-errors')
const {
  jsonBodyParser,
  validator,
  httpHeaderNormalizer,
  cors
} = require('middy/middlewares')
const { config } = require('./config')
const AWS = require('aws-sdk')

AWS.config.update({
  region: config.aws.dynamodb.region
})

async function generateRides (event) {
  // DynamoDB schema

  // id: S
  // expires: N - epoch timestamp
  // ??
}

const inputSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        token: { type: 'string', pattern: '.+' }
      },
      required: ['token']
    }
  }
}

const errorHandler = () => ({
  onError: (handler, next) => {
    if (handler.error instanceof HttpError) {
      if (handler.error.message.includes('failed validation')) {
        const details = handler.error.details[0]

        handler.response = {
          statusCode: 422,
          body: JSON.stringify({
            field: details.dataPath.replace('.body.', '')
          })
        }

        next()
      } else {
        next(handler.error)
      }
    } else {
      next(handler.error)
    }
  }
})

module.exports = {
  handler: middy(generateRides)
    .use(httpHeaderNormalizer())
    .use(jsonBodyParser())
    .use(validator({ inputSchema }))
    .use(errorHandler())
    .use(cors({
      origin: process.env.NODE_ENV !== 'development' ? 'https://peckham.cc' : '*'
    }))
}
