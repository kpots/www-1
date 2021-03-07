import {
  SIGN_IN,
  SIGN_OUT,
  SELECTED_GENDER,
  SELECTED_SIZE,
  ACCEPTED_TERMS,
  UPDATE_USER,
  SESSION_EXPIRED_TOKEN
} from '../actions'

const initialState = {
  name: null,
  email: null,
  phone: null,
  size: null,
  gender: null,
  fopcc: null,
  acceptedTerms: false,
  admin: null,
  rrcAdmin: null,
  kitAdmin: null,
  membersAdmin: null
}

const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case SIGN_IN:
      return {
        ...state,
        name: action.payload.name,
        email: action.payload.email,
        phone: action.payload.phone,
        size: action.payload.size,
        gender: action.payload.gender,
        fopcc: action.payload.fopcc,
        rrcAdmin: action.payload.rrcAdmin,
        kitAdmin: action.payload.kitAdmin,
        membersAdmin: action.payload.membersAdmin,
        admin: action.payload.rrcAdmin || action.payload.kitAdmin || action.payload.membersAdmin
      }
    case SIGN_OUT:
    case SESSION_EXPIRED_TOKEN:
      return {
        ...state,
        name: null,
        email: null,
        phone: null,
        size: null,
        gender: null,
        fopcc: null,
        acceptedTerms: false,
        admin: null,
        rrcAdmin: null,
        kitAdmin: null,
        membersAdmin: null
      }
    case SELECTED_GENDER:
      return {
        ...state,
        gender: action.payload
      }
    case SELECTED_SIZE:
      return {
        ...state,
        size: action.payload
      }
    case ACCEPTED_TERMS:
      return {
        ...state,
        acceptedTerms: action.payload
      }
    case UPDATE_USER:
      return {
        ...state,
        ...(Object.keys(action.payload).reduce((state, key) => {
          state[key] = action.payload[key]
          return state
        }, {}))
      }
    default:
      return state
  }
}

export default userReducer
