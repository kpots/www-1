import React, {
  Component
} from 'react'
import PropTypes from 'prop-types'
import {
  Button
} from '../components/panels'
import {
  connect
} from 'react-redux'
import config from '../config'
import {
  clearCart
} from '../store/actions'
import Isemail from 'isemail'
import {
  Label,
  Input,
  CheckoutWrapper,
  TransactionId,
  FormInputWrapper,
  ErrorText,
  PaymentHolder,
  PlaceHolder
} from './forms'

const STEPS = {
  LOADING_TOKEN: 'LOADING_TOKEN',
  ENTER_DETAILS: 'ENTER_DETAILS',
  CHOOSE_PAYMENT_METHOD: 'CHOOSE_PAYMENT_METHOD',
  SUBMITTING_PAYMENT: 'SUBMITTING_PAYMENT',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
}

class LoadingToken extends Component {
  componentDidMount () {
    global.fetch(config.lambda.clientToken, {
      method: 'POST'
    })
      .then(response => {
        if (response.status !== 200) {
          throw new Error(response.statusText)
        }

        return response.json()
      })
      .then(result => {
        this.props.onToken(result.clientToken)
      })
      .catch(error => {
        this.props.onError(error)
      })
  }

  render () {
    return (
      <p>Loading payment methods...</p>
    )
  }
}

class DisplayError extends Component {
  render () {
    return (
      <div>
        <p>Something went wrong, please try again later</p>
        <p>{this.props.error.message}</p>
      </div>
    )
  }
}

class MakingPayment extends Component {
  render () {
    return (
      <div>
        <p>Making payment, hold on...</p>
      </div>
    )
  }
}

class DisplaySuccess extends Component {
  render () {
    return (
      <div data-result='payment-success'>
        <h2>Payment complete</h2>
        <p>The transaction was processed successfully.  A confirmation email should soon arrive in your inbox.</p>
        <p>This is your transaction ID, please keep a note of it:</p>
        <TransactionId data-transaction-id>{this.props.transactionId}</TransactionId>
        <h3>What's next?</h3>
        <p>Your order will be submitted to the factory soon. We'll be in touch with the delivery date once we have it.</p>
      </div>
    )
  }
}

class EnterDetails extends Component {
  constructor (props) {
    super(props)

    this.state = {
      values: {
        firstName: '',
        lastName: '',
        email: ''
      },
      errors: {}
    }
  }

  formFieldChanged = (name) => {
    return (event) => {
      const state = {
        values: Object.assign({}, this.state.values, {
          [name]: event.target.value.trim()
        }),
        errors: this.state.errors
      }

      this.validate(state)
    }
  }

  validate = (state) => {
    Object.keys(state.values).forEach(key => {
      delete state.errors[key]

      if (!state.values[key]) {
        state.errors[key] = true
      }
    })

    if (!Isemail.validate(state.values.email)) {
      state.errors.email = true
    }

    this.setState(state)
  }

  handleNext = () => {
    this.validate(this.state)

    if (Object.keys(this.state.errors).length) {
      return
    }

    this.props.onDetails({
      firstName: this.state.values.firstName,
      lastName: this.state.values.lastName,
      email: this.state.values.email
    })
  }

  render () {
    return (
      <CheckoutWrapper>
        <h3>Your details:</h3>
        <FormInputWrapper error={this.state.errors.firstName}>
          <Label htmlFor='firstName'>First name {this.state.errors.firstName && 'is required'}</Label>
          <Input
            name='firstName'
            type='text'
            onChange={this.formFieldChanged('firstName')} value={this.state.values.firstName}
            data-input='first-name'
          />
        </FormInputWrapper>
        <FormInputWrapper error={this.state.errors.lastName}>
          <Label htmlFor='lastName'>Last name {this.state.errors.lastName && 'is required'}</Label>
          <Input
            name='lastName'
            type='text'
            onChange={this.formFieldChanged('lastName')}
            value={this.state.lastName}
            data-input='last-name'
          />
        </FormInputWrapper>
        <FormInputWrapper error={this.state.errors.email}>
          <Label htmlFor='email'>Email {this.state.errors.email && 'must be a valid email'}</Label>
          <Input
            name='email'
            type='email'
            onChange={this.formFieldChanged('email')}
            value={this.state.email}
            data-input='email'
          />
        </FormInputWrapper>
        <Button
          onClick={this.handleNext}
          disabled={Object.keys(this.state.errors).length}
          data-button='choose-payment-method'
        >Choose payment method
        </Button>
      </CheckoutWrapper>
    )
  }
}

class ChoosePaymentMethod extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true
    }
  }

  componentDidMount () {
    global.braintree.dropin.create({
      authorization: this.props.clientToken,
      container: this.paymentHolder,
      paypal: {
        flow: 'checkout'
      }
    }, (error, instance) => {
      if (error) {
        this.props.onError(error)
      }

      this.paymentProvider = instance

      this.setState({
        loading: false
      })
    })
  }

  handleRequestPaymentMethod = () => {
    this.setState({
      requestingPaymentMethod: true
    })

    this.paymentProvider.requestPaymentMethod((error, payload) => {
      if (error) {
        return this.setState({
          requestingPaymentMethod: false,
          error: error.message
        })
      }

      this.setState({
        requestingPaymentMethod: false
      })

      this.props.onPayment(payload.nonce)
    })
  }

  render () {
    const {
      loading,
      error,
      requestingPaymentMethod
    } = this.state

    let button = ''

    if (!loading) {
      button = (
        <Button
          onClick={this.handleRequestPaymentMethod}
          disabled={requestingPaymentMethod}
          data-button='submit-payment'
        >Submit payment
        </Button>
      )
    }

    return (
      <PaymentHolder>
        {loading && <p>Loading payment methods...</p>}
        {error && <ErrorText>{error}</ErrorText>}
        <PlaceHolder>
          <div ref={ref => { this.paymentHolder = ref }} />
        </PlaceHolder>
        {button}
      </PaymentHolder>
    )
  }
}

class Checkout extends Component {
  constructor (props) {
    super(props)

    if (!global.braintree) {
      this.state = {
        step: STEPS.ERROR,
        error: new Error('Could not load payment methods')
      }

      return
    }

    this.state = {
      step: STEPS.LOADING_TOKEN,
      error: null
    }
  }

  handleClientToken = (clientToken) => {
    this.setState({
      clientToken,
      step: STEPS.ENTER_DETAILS
    })
  }

  handleCustomerDetails = (customerDetails) => {
    this.setState({
      customerDetails,
      step: STEPS.CHOOSE_PAYMENT_METHOD
    })
  }

  handlePayment = (nonce) => {
    this.setState({
      step: STEPS.SUBMITTING_PAYMENT
    })

    global.fetch(config.lambda.sendPayment, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: this.state.customerDetails.firstName.trim(),
        lastName: this.state.customerDetails.lastName.trim(),
        email: this.state.customerDetails.email.trim(),
        nonce: nonce,
        items: this.props.cart
      })
    })
      .then(response => {
        if (response.status !== 200) {
          throw new Error(response.statusText)
        }

        response.json()
      })
      .then(result => {
        console.info('payment result', result)

        if (result.errors) {
          this.setState({
            step: STEPS.ERROR,
            error: result.errors[0]
          })

          console.error(result.errors)

          return
        }

        this.setState({
          step: STEPS.SUCCESS,
          transactionId: result.transaction
        })

        this.props.clearCart()
      })
      .catch(error => {
        this.setState({
          step: STEPS.ERROR,
          error
        })

        console.error('payment error', error)
      })
  }

  handleError = (error) => {
    this.setState({
      error,
      step: STEPS.ERROR
    })
  }

  render () {
    const {
      step,
      clientToken,
      error,
      transactionId
    } = this.state

    const steps = {
      [STEPS.LOADING_TOKEN]: <LoadingToken onToken={this.handleClientToken} onError={this.handleError} />,
      [STEPS.ENTER_DETAILS]: <EnterDetails onDetails={this.handleCustomerDetails} />,
      [STEPS.CHOOSE_PAYMENT_METHOD]: <ChoosePaymentMethod clientToken={clientToken} onPayment={this.handlePayment} onError={this.handleError} />,
      [STEPS.SUBMITTING_PAYMENT]: <MakingPayment />,
      [STEPS.SUCCESS]: <DisplaySuccess transactionId={transactionId} />,
      [STEPS.ERROR]: <DisplayError error={error} />
    }

    if (steps[step]) {
      return steps[step]
    }

    return steps[STEPS.ERROR]
  }
}

Checkout.propTypes = {
  cart: PropTypes.array.isRequired,
  user: PropTypes.object
}

const mapStateToProps = ({ shop: { cart }, user: { user } }) => ({
  cart,
  user
})

const mapDispatchToProps = {
  clearCart
}

export default connect(mapStateToProps, mapDispatchToProps)(Checkout)
