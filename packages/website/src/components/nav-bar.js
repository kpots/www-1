import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'
import ShoppingCartIcon from 'react-icons/lib/fa/shopping-cart'
import HamburgerMeunIcon from 'react-icons/lib/fa/bars'
import { Link, withRouter } from 'react-router-dom'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { signOut } from '../store/actions'
import {
  FlexContainerCentered,
  FlexContentLeft,
  FlexContentCenter,
  FlexContentRight
} from './panels'
import pccAvatar from '../../assets/pcc-logo-round.png'
import { Break, ModalBlocker } from './panels'
import { spacing } from '../units'
import onscrolling from 'onscrolling'

const CartContentsCount = styled.div`
  color: #FFF;
  background-color: #F10;
  border-radius: ${spacing(1)};
  font-size: ${spacing(1)};
  font-weight: bold;
  text-align: center;
  padding: 2px 5px;
  position: absolute;
  top: -5px;
  right: -10px;
`

const NavBar = styled.nav`
  padding: 0 0 0 0;
  height: 60px;
  margin: 0;
  top: 8px;
  left: 0;
  right: 0;
  z-index: 500;
  position: fixed;
  background-color: #FFF;
`

const LongMenu = styled.div`
  @media (max-width: 640px) {
    display: none
  }
`

const HamburgerMenu = styled.div`
  margin: 15px 0 0 15px;

  @media (min-width: 641px) {
    display: none
  }
`

const NavLink = styled.li`
  list-style: none;
  display: inline-block;
  margin-right: 20px;
  font-size: 18px;

  a {
    text-decoration: none;
    color: #333;
  }
  a:hover {
    text-decoration: underline;
    color: #F10;
  }
`

const CartLink = NavLink.extend`
  font-size: 24px;
  margin-right: 0;
`

const SiteNav = FlexContentLeft.extend`
  padding: ${spacing(1)} 0 0 ${spacing(2)};
`

const MobileNav = styled.ul`
  background: #FFF;
  margin: 0;
  padding: 10px;

  li {
    display: block;
    padding: 10px;
  }

  @media (min-width: 641px) {
    display: none
  }
`

const SiteIcon = styled.div`
  padding: 5px 0 0 0;
  position: absolute;
  top: 0;
  left: 50vw;
  margin-left: -25px;
`

const AccountNav = styled.div`
  padding: ${spacing(1)} ${spacing(2)} 0 0;
  position: absolute;
  top: 0;
  right: 0;
`

class NavBarWrapper extends Component {
  static propTypes = {
    cart: PropTypes.array.isRequired,
    user: PropTypes.object,
    signOut: PropTypes.func.isRequired,
    location: PropTypes.object.isRequired
  }

  state = {
    bgOpacity: 0,
    top: 8,
    menuOpen: false
  }

  componentDidMount () {
    onscrolling(this.handleScroll)
  }

  componentWillUnmount () {
    onscrolling.remove(this.handleScroll)
  }

  handleScroll = () => {
    const { pageYOffset } = window

    this.setState({
      bgOpacity: pageYOffset < 100 ? pageYOffset/100 : 1,
      top: pageYOffset > 8 ? 0 : 8 - pageYOffset
    })
  }

  toggleDropDownMenu = () => {
    this.setState(s => ({
      menuOpen: !s.menuOpen
    }))
  }

  render () {
    const { cart, user, signOut, location: { pathname } } = this.props
    const { bgOpacity, top, menuOpen } = this.state
    let logoOpacity = 1

    if (pathname === '/') {
      logoOpacity = bgOpacity
    }

    const cartContents = cart.reduce((acc, curr) => {
      return acc + curr.quantity
    }, 0)

    return (
      <NavBar style={{
        top
      }}>
        <SiteIcon style={{
              opacity: logoOpacity
            }}>
          <Link to='/'>
            <img src={pccAvatar} height="50" width="50" />
          </Link>
        </SiteIcon>

        <LongMenu>
          <FlexContainerCentered>
            <SiteNav>
              <NavLink>
                <Link to='/'>Home</Link>
              </NavLink>
              <NavLink>
                <Link to='/rides'>Rides</Link>
              </NavLink>
              <NavLink>
                <Link to='/routes'>Routes</Link>
              </NavLink>
              <NavLink>
                <Link to='/shop'>Shop</Link>
              </NavLink>
            </SiteNav>
          </FlexContainerCentered>
        </LongMenu>

        <HamburgerMenu onClick={this.toggleDropDownMenu}>
          <HamburgerMeunIcon />
        </HamburgerMenu>

        <AccountNav>
          <CartLink>
            <Link to='/basket' style={{position: 'relative'}}>
              {cartContents ? <CartContentsCount>{cartContents}</CartContentsCount> : null}
              <ShoppingCartIcon />
            </Link>
          </CartLink>
          {user ? (
            <Fragment>
              <NavigationMenu
                id='menu-appbar-account'
                icon={<AccountCircle />}
                options={[
                  <Button component={({...props}) => <Link to='/account' {...props} />}>My account</Button>,
                  <Button component={({...props}) => <Link to='/orders' {...props} />}>My orders</Button>,
                  <Button component={({...props}) => <Link to='/logout' {...props} />}>Log out</Button>
                ]}
              />
            </Fragment>
          ) : null}
        </AccountNav>

        {menuOpen && (
          <ModalBlocker onClick={this.toggleDropDownMenu} style={{top: 68}}>
            <MobileNav>
              <NavLink>
                <Link to='/'>Home</Link>
              </NavLink>
              <NavLink>
                <Link to='/rides'>Rides</Link>
              </NavLink>
              <NavLink>
                <Link to='/routes'>Routes</Link>
              </NavLink>
              <NavLink>
                <Link to='/shop'>Shop</Link>
              </NavLink>
            </MobileNav>
          </ModalBlocker>
        )}

      </NavBar>
    )
  }
}

const mapStateToProps = ({ shop: { cart }, user: { user } }) => ({
  cart,
  user
})

const mapDispatchToProps = {
  signOut: signOut
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(NavBarWrapper))
