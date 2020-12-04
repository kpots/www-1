import React, {
  Component
} from 'react'
import {
  PageWrapper,
  Panel,
  InnerPanel,
  Hero
} from '../components/panels'
import routesBackground from '../../assets/routes-bg.jpg'
import styled from 'styled-components'
import {
  FaRegMap,
  FaBicycle,
  FaRoad,
  FaTree,
  FaArrowRight,
  FaArrowUp
} from 'react-icons/fa'
import {
  light
} from '../colours'
import {
  spacing
} from '../units'
import {
  Input
} from '../components/forms'
import routes from '../../assets/routes'

const Map = styled.img`
  max-width: 500px;
  max-height: 400px;
  margin-top: 20px;
`

const SharingList = styled.ul`
  margin: 0 0 20px 10px;
  padding: 0;
`

const Sharing = styled.li`
  list-style: none;
  margin-bottom: ${spacing(0.5)};

  a {
    text-decoration: none;
    color: ${light};
  }

  a:hover {
    text-decoration: underline;
  }
`

const RouteTitle = styled.h3`
  small {
    margin: 0 ${spacing(0.5)};
    color: ${light};
  }
`

const MapLink = styled.a`
  margin: 0 ${spacing(0.5)} 0 0;
`

const MAX_DISTANCE = routes.map(route => route.distance).reduce((acc, curr) => curr > acc ? curr : acc, 0)
const MAX_VERT = routes.map(route => route.vert).reduce((acc, curr) => curr > acc ? curr : acc, 0)

const RoutesPanel = styled.div`
  display: flex;
  flex-direction: row;

  @media (max-width: 940px) {
    display: block;
  }
`

const Filter = styled.div`
  margin-right: ${spacing(1)};
  max-width: 344px;

  @media (max-width: 940px) {
    max-width: 100%;
    margin-right: 0;
  }
`

const FilterCategory = styled.div`
  display: inline-block;
  padding-right: ${spacing(2)};
`

const Routes = styled.div`
  flex-grow: 1;
`

class RoutesPage extends Component {
  state = {
    distance: {
      min: 0,
      max: MAX_DISTANCE
    },
    vert: {
      min: 0,
      max: MAX_VERT
    },
    types: [
      'road'
    ],
    search: ''
  }

  handleSearchChange (value) {
    this.setState({
      search: value
    })
  }

  handleTypeChange (type) {
    let {
      types
    } = this.state

    if (types.includes(type)) {
      types = types.filter(t => t !== type)
    } else {
      types.push(type)
    }

    this.setState({
      types
    })
  }

  handleChange (field, type, value) {
    const state = this.state

    if (type === 'min' && value >= state[field].max) {
      return
    }

    if (type === 'max' && value <= state[field].min) {
      return
    }

    state[field][type] = value

    this.setState(state)
  }

  render () {
    const {
      distance,
      vert,
      search,
      types
    } = this.state

    const selectedRoutes = routes.filter(route => {
      let include = true

      if (search) {
        include = route.title.toLowerCase().includes(search.toLowerCase())
      }

      include = include && route.distance >= distance.min
      include = include && route.distance <= distance.max

      include = include && route.vert >= vert.min
      include = include && route.vert <= vert.max

      include = include && types.includes(route.type)

      return include
    })
      .sort((a, b) => a.title.localeCompare(b.title))

    return (
      <PageWrapper>
        <Hero background={routesBackground.src} />
        <Panel>
          <h2>Club Routes</h2>
          <p>Peckham CC has a variety of routes that we often draw from, ranging from 50-60km social rides all the way up to hilly epics and seaside jaunts.</p>
          <p>Feel free to grab any of the routes from our collection, and download GPX files to your phone or bike computer to help you navigate on the go.</p>
          <RoutesPanel>
            <Filter>
              <InnerPanel>
                <p>Search: <Input type='search' value={search} onChange={(event) => this.handleSearchChange(`${event.target.value}`.trim())} /></p>
                <FilterCategory>
                  <p>Type:</p>
                  <p><FaRoad /> Road <input type='checkbox' checked={types.includes('road')} onChange={() => this.handleTypeChange('road')} /></p>
                  <p><FaTree /> Off-road <input type='checkbox' checked={types.includes('off-road')} onChange={() => this.handleTypeChange('off-road')} /></p>
                </FilterCategory>
                <FilterCategory>
                  <p>Distance:</p>
                  <p>Min <input type='range' min={1} max={MAX_DISTANCE} value={distance.min} onChange={(event) => this.handleChange('distance', 'min', parseInt(event.target.value))} /> {distance.min}km</p>
                  <p>Max <input type='range' min={1} max={MAX_DISTANCE} value={distance.max} onChange={(event) => this.handleChange('distance', 'max', parseInt(event.target.value))} /> {distance.max}km</p>
                </FilterCategory>
                <FilterCategory>
                  <p>Vertical:</p>
                  <p>Min <input type='range' min={1} max={MAX_VERT} value={vert.min} onChange={(event) => this.handleChange('vert', 'min', parseInt(event.target.value))} /> {vert.min}m</p>
                  <p>Max <input type='range' min={1} max={MAX_VERT} value={vert.max} onChange={(event) => this.handleChange('vert', 'max', parseInt(event.target.value))} /> {vert.max}m</p>
                </FilterCategory>
              </InnerPanel>
            </Filter>
            <Routes>
              {
                selectedRoutes.length ? selectedRoutes.map((route, index) => {
                  return (
                    <InnerPanel key={index}>
                      <RouteTitle id={route.hash}>{route.type === 'road' ? <FaRoad /> : <FaTree />} {route.title} <small><FaArrowRight /> {route.distance}km <FaArrowUp /> {route.vert}m</small></RouteTitle>
                      <SharingList>
                        <Sharing><MapLink href={route.gpx}><FaRegMap /> .gpx</MapLink> <MapLink href={route.fit}><FaRegMap /> .fit</MapLink></Sharing>
                        <Sharing><a href={route.link}><FaBicycle /> View on Ride with GPS</a></Sharing>
                      </SharingList>
                      <p>{route.description}</p>
                      <Map name={route.title} src={route.map} />
                    </InnerPanel>
                  )
                }) : (
                  <>
                    <InnerPanel>
                      <h3>No results</h3>
                      <p>Nothing matched your search, maybe try some different search parameters?</p>
                    </InnerPanel>
                  </>
                )
              }
            </Routes>
          </RoutesPanel>
        </Panel>
      </PageWrapper>
    )
  }
}

export default RoutesPage
