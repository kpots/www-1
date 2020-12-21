const { nanoid } = require('nanoid')
const httpErrors = require('http-errors')
const jsonDb = require('./json-db')

const tokens = jsonDb('tokens.json')
const users = jsonDb('users.json')
const userLookup = jsonDb('user-lookup.json')

const ONE_HOUR = (60 * 60) * 1000
const ONE_DAY = ONE_HOUR * 24

function tokenExpiry () {
  return new Date(Date.now() + ONE_DAY).getTime()
}

async function extendToken (key) {
  tokens.values[key].expires = tokenExpiry()
  tokens.save()
}

const REDIRECT_URLS = {
  '/profile': true,
  '/shop': true,
  '/ride-roulette': true,
  '/checkout': true
}

async function generateLogInLink (email, redirect) {
  if (!REDIRECT_URLS[redirect]) {
    throw httpErrors.BadRequest('Invalid redirect')
  }

  email = email.toLowerCase()

  let user = userLookup.values[email]

  // create new user
  if (!user) {
    console.info('creating new user')
    user = nanoid()

    users.values[user] = {
      email
    }
    users.save()

    userLookup.values[email] = user
    userLookup.save()
  }

  const key = nanoid()

  tokens.values[key] = {
    user,
    expires: tokenExpiry()
  }
  tokens.save()

  return `http://localhost:9000${redirect}?token=${key}`
}

async function getUserIdForToken (token) {
  // simulate DynamoDB TTL
  if (tokens.values[token] && tokens.values[token].expires < Date.now()) {
    delete tokens.values[token]
    tokens.save()

    console.info('token', token, 'expired')
  }

  if (!tokens.values[token]) {
    console.info('token', token, 'missing', tokens.values)
    throw new httpErrors.Unauthorized('Missing or invalid credentials')
  }

  await extendToken(token)

  return tokens.values[token].user
}

async function updateUser (id, details) {
  const user = await getUser(id)

  if (!user) {
    throw new Error('Could not load user for id', id)
  }

  users.values[id] = {
    ...user,
    ...details
  }
  users.save()

  if (details.email && user.email !== details.email) {
    delete userLookup.values[user.email]
    userLookup.values[details.email] = id
    userLookup.save()
  }

  return getUser(id)
}

async function getUser (id) {
  return users.values[id]
}

async function addUserOrder (userId, orderId) {
  const user = await getUser(userId)

  if (!user) {
    throw new Error('Could not load user for id', userId)
  }

  user.orders = user.orders || []
  user.orders.push(orderId)

  users.save()
}

async function getUserFoPCCStatus (id) {
  return {}
}

async function getUserOrders (id) {
  return []
}

async function getUserTrainingSessions (id) {
  return []
}

module.exports = {
  generateLogInLink,
  getUserIdForToken,
  updateUser,
  getUser,
  getUserFoPCCStatus,
  getUserOrders,
  getUserTrainingSessions,
  addUserOrder
}
