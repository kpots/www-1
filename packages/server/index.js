const express = require('express')
const bodyParser = require('body-parser')
const serveStatic = require('serve-static')
const path = require('path')
const { nanoid } = require('nanoid')
const { config } = require('@peckhamcc/config')
const sendPaymentLambda = require('@peckhamcc/lambda-send-payment')
const sendContactFormEmail = require('@peckhamcc/lambda-send-contact-form-email')
const sendCorsHeaders = require('@peckhamcc/lambda-send-cors-headers')
const rideRoulettePreferencesSet = require('@peckhamcc/lambda-ride-roulette-preferences-set')
const rideRouletteRidesGenerate = require('@peckhamcc/lambda-ride-roulette-rides-generate')
const rideRouletteRidesGet = require('@peckhamcc/lambda-ride-roulette-rides-get')
const accountTokenGenerate = require('@peckhamcc/lambda-account-token-generate')
const accountUserGet = require('@peckhamcc/lambda-account-user-get')
const accountUserUpdate = require('@peckhamcc/lambda-account-user-update')
const shopOrdersCreate = require('@peckhamcc/lambda-shop-orders-create')
const shopOrdersGet = require('@peckhamcc/lambda-shop-orders-get')
const shopPaymentsCreate = require('@peckhamcc/lambda-shop-payments-create')
const shopProductsGet = require('@peckhamcc/lambda-shop-products-get')
const { callbackify } = require('util')

const ACCOUNT_ID = nanoid()
const API_ID = nanoid()

// simulate a lambda
const serveLambda = (name, lambda) => {
  const RESOURCE_ID = nanoid()

  return async (request, response) => {
    let body = ''

    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      for await (const buf of request.body) {
        body += buf.toString('utf8')
      }
    }

    const headers = {}
    const multiValueHeaders = {}

    for (let i = 0; i < request.rawHeaders.length; i += 2) {
      const key = request.rawHeaders[i]
      const value = request.rawHeaders[i + 1]

      headers[key] = value
      multiValueHeaders[key] = [value]
    }

    // an AWS Proxy event https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html
    const event = {
      resource: request.path,
      path: request.path,
      httpMethod: request.method,
      headers: headers,
      multiValueHeaders: multiValueHeaders,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {
        resourceId: RESOURCE_ID,
        resourcePath: request.url,
        httpMethod: request.method,
        extendedRequestId: nanoid(),
        requestTime: `${new Date()}`,
        path: request.url,
        accountId: ACCOUNT_ID,
        protocol: `HTTP/${request.httpVersion}`,
        stage: 'prod',
        domainPrefix: 'api',
        requestTimeEpoch: Math.round(Date.now() / 1000),
        requestId: nanoid(),
        identity: {
          cognitoIdentityPoolId: null,
          accountId: null,
          cognitoIdentityId: null,
          caller: null,
          sourceIp: request.headers['x-forwarded-for'] || request.connection.remoteAddress,
          principalOrgId: null,
          accessKey: null,
          cognitoAuthenticationType: null,
          cognitoAuthenticationProvider: null,
          userArn: null,
          userAgent: headers['user-agent'],
          user: null
        },
        domainName: 'localhost',
        apiId: API_ID
      },
      body,
      rawHeaders: headers,
      rawMultiValueHeaders: multiValueHeaders
    }

    const now = new Date()

    const context = {
      callbackWaitsForEmptyEventLoop: true,
      functionVersion: '$LATEST',
      functionName: name,
      memoryLimitInMB: '128',
      logGroupName: `/aws/lambda/${name}`,
      logStreamName: `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}/[$LATEST]${nanoid()}`,
      invokedFunctionArn: `arn:aws:lambda:eu-west-2:${ACCOUNT_ID}:function:${name}`,
      awsRequestId: nanoid()
    }

    let handler = lambda.handler

    if (handler.length !== 3) {
      handler = callbackify(handler)
    }

    handler(event, context, (error, result) => {
      if (error) {
        console.error(error)

        return response.status(500).send(error)
      }

      if (!result) {
        return response.status(204).send()
      }

      response
        .status(result.statusCode)
        .set(result.headers)
        .send(result.body)
    })
  }
}

module.exports = (port) => {
  return new Promise((resolve) => {
    const app = express()

    // main site
    app.use('/', serveStatic(path.resolve(path.join(__dirname, 'node_modules', '@peckhamcc', 'website', 'dist'))))

    // "lambdas"
    app.use(bodyParser.text({ type: '*/*' }))

    app.options(config.lambda.sendPayment, serveLambda('_peckhamcc_lambda-send-payment', sendCorsHeaders))
    app.post(config.lambda.sendPayment, serveLambda('_peckhamcc_lambda-send-payment', sendPaymentLambda))

    app.options(config.lambda.sendContactFormEmail, serveLambda('_peckhamcc_lambda-contact-form-email', sendCorsHeaders))
    app.post(config.lambda.sendContactFormEmail, serveLambda('_peckhamcc_lambda-contact-form-email', sendContactFormEmail))

    app.options(config.lambda.rideRoulettePreferencesSet, serveLambda('_peckhamcc_lambda-ride-roulette-preferences-set', sendCorsHeaders))
    app.put(config.lambda.rideRoulettePreferencesSet, serveLambda('_peckhamcc_lambda-ride-roulette-preferences-set', rideRoulettePreferencesSet))

    app.options('/lambda/ride-roulette-rides-generate', serveLambda('_peckhamcc_lambda-ride-roulette-rides-generate', sendCorsHeaders))
    app.get('/lambda/ride-roulette-rides-generate', serveLambda('_peckhamcc_lambda-ride-roulette-rides-generate', rideRouletteRidesGenerate))

    app.options(config.lambda.rideRouletteRidesGet, serveLambda('_peckhamcc_lambda-ride-roulette-rides-get', sendCorsHeaders))
    app.get(config.lambda.rideRouletteRidesGet, serveLambda('_peckhamcc_lambda-ride-roulette-rides-get', rideRouletteRidesGet))

    app.options(config.lambda.accountTokenGenerate, serveLambda('_peckhamcc_lambda-account-token-generate', sendCorsHeaders))
    app.post(config.lambda.accountTokenGenerate, serveLambda('_peckhamcc_lambda-account-token-generate', accountTokenGenerate))

    app.options(config.lambda.accountUserGet, serveLambda('_peckhamcc_lambda-account-user-get', sendCorsHeaders))
    app.get(config.lambda.accountUserGet, serveLambda('_peckhamcc_lambda-account-user-get', accountUserGet))

    app.options(config.lambda.accountUserUpdate, serveLambda('_peckhamcc_lambda-account-user-update', sendCorsHeaders))
    app.patch(config.lambda.accountUserUpdate, serveLambda('_peckhamcc_lambda-account-user-update', accountUserUpdate))

    app.options(config.lambda.shopProductsGet, serveLambda('_peckhamcc_lambda-shop-products-get', sendCorsHeaders))
    app.get(config.lambda.shopProductsGet, serveLambda('_peckhamcc_lambda-shop-products-get', shopProductsGet))

    app.options(config.lambda.shopOrdersCreate, serveLambda('_peckhamcc_lambda-shop-orders-create', sendCorsHeaders))
    app.post(config.lambda.shopOrdersCreate, serveLambda('_peckhamcc_lambda-shop-orders-create', shopOrdersCreate))

    app.options(config.lambda.shopOrdersGet, serveLambda('_peckhamcc_lambda-shop-orders-get', sendCorsHeaders))
    app.get(config.lambda.shopOrdersGet, serveLambda('_peckhamcc_lambda-shop-orders-get', shopOrdersGet))

    app.options(config.lambda.shopPaymentsCreate, serveLambda('_peckhamcc_lambda-shop-payments-create', sendCorsHeaders))
    app.post(config.lambda.shopPaymentsCreate, serveLambda('_peckhamcc_lambda-shop-payments-create', shopPaymentsCreate))

    app.use((_, response) => {
      response.sendFile(path.join(__dirname, 'node_modules', '@peckhamcc', 'website', 'dist', 'index.html'))
    })

    const listener = app.listen(port, () => {
      resolve({
        url: `http://localhost:${listener.address().port}`,
        stop: () => {
          return new Promise((resolve) => {
            listener.close(() => resolve())
          })
        }
      })
    })
  })
}
