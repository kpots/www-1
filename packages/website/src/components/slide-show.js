import React from 'react'
import styled, {
  keyframes
} from 'styled-components'
import {
  MAX_PAGE_WIDTH
} from '../units'

const FADE_TIME = 50

const fadeOut = (props) => {
  const t = 100 / props.total

  return keyframes`
    0% {
      opacity: 1;
    }

    ${(t * (props.total / 10)) * 1.2}% {
      opacity: 1;
    }

    ${t * 1.2}% {
      opacity: 0;
    }

    100% {
      opacity: 0;
    }
  `
}

const Container = styled.ul`
  list-style: none;
  overflow: hidden;
  height: 100vh;
  padding: 0;
  margin: 0;
`

const Slide = styled.li`
  position: absolute;
  opacity: 0;
  height: 100vh;
  width: 100%;
  max-width: ${MAX_PAGE_WIDTH};
  z-index: ${props => 100 - props.order};
  background-image: ${props => 'url("' + props.background + '")'};
  background-size: cover;
  background-position: center top;
  animation: ${fadeOut} ${FADE_TIME}s ${props => props.order * (FADE_TIME * (1 / props.total))}s linear infinite;
`

const SlideShowWrapper = ({ slides }) => {
  return (
    <Container>
      {slides.map((background, key, array) => <Slide background={background} key={key} order={key} total={array.length} />)}
    </Container>
  )
}

export default SlideShowWrapper
