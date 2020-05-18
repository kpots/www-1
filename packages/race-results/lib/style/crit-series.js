const format = require('format-duration')
const createProfile = require('./profile')

const POINTS = [
  20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
]

function calculateSeriesPoints (comps, riders, filterRiders = () => Boolean) {
  const scores = {}

  comps.forEach(comp =>{
    const positions = calculatePositions(comp.times, filterRiders)

    positions.forEach(({ group }, index) => {
      group.forEach(id => {
        scores[id] = (scores[id] || 0) + (POINTS[index] || 0)
      })
    })
  })

  const positions = calculatePositions(scores, filterRiders = () => Boolean, (a, b) => b - a)
  const output = []

  positions.forEach(({ value, group }, index) => {
    group.forEach(id => {
      const rider = riders[id]

      let avatar = `'${rider.profile_medium}'`

      if (!avatar.startsWith('\'http')) {
        avatar = '{pccAvatar}'
      }

      output.push([
        index + 1,
        `<a href='https://www.strava.com/athletes/${rider.id}'><ResultAvatar src=${avatar} /></a><ResultRiderName>${rider.firstname} ${rider.lastname}</ResultRiderName>`,
        value
      ])
    })
  })

  return output
}

function calculatePositions (times, filterRiders, sort = (a, b) => a - b) {
  const positions = []
  const sorted = Object.keys(times)
    .filter(filterRiders)
    .sort((a, b) => {
      return sort(times[a], times[b])
    })

  sorted.forEach(id => {
    const added = positions.some(position => {
      if (position.value === times[id]) {
        position.group.push(id)
        return true
      }
    })

    if (added) {
      positions.push({
        group: []
      })
    } else {
      positions.push({
        value: times[id],
        group: [id]
      })
    }
  })

  return positions
}

function calculateStageTime (stage, riders, filterRiders = () => Boolean) {
  const positions = calculatePositions(stage.times, filterRiders)
  const output = []

  if (!positions.length) {
    return output
  }

  let fastest = positions[0].value

  positions.forEach(({ value, group }, index) => {
    group.forEach(id => {
      const rider = riders[id]
      const position = index + 1
      let formatted = value

      if (position === 1) {
        formatted = format(value)
      } else if (value !== 'DNF') {
        formatted = `+${format(value - fastest)}`
      }

      let avatar = `'${rider.profile_medium}'`

      if (!avatar.startsWith('\'http')) {
        avatar = '{pccAvatar}'
      }

      const activity = stage.activities[id]
      let activityLink = ''

      if (activity) {
        activityLink = `<a href='https://www.strava.com/activities/${activity.id}'><ResultIcon src={stravaIcon} /></a>`
      }

      output.push([
        position,
        `<a href='https://www.strava.com/athletes/${rider.id}'><ResultAvatar src=${avatar} /></a><ResultRiderName>${rider.firstname} ${rider.lastname}</ResultRiderName>`,
        activityLink,
        formatted
      ])
    })
  })

  return output
}

module.exports = function critSeries (race, riders) {
  // Multiple stage race
  // GC for overall
  // Points for sprints
  // Mountain points for climbs
  const women = id => riders[id].sex === 'F'

  const output = {
    name: race.name,
    description: race.description,
    results: [{
      name: 'Points (General)',
      headers: ['Position', 'Name', 'Points'],
      rows: calculateSeriesPoints(race.stages, riders)
    }, {
      name: 'Points (Women)',
      headers: ['Position', 'Name', 'Points'],
      rows: calculateSeriesPoints(race.stages, riders, women)
    }],
    stages: []
  }

  race.stages.forEach(stage => {
    const results = [{
      name: '⏱️ General',
      headers: ['Position', 'Name', 'Activity', 'Time'],
      rows: calculateStageTime(stage, riders)
    }, {
      name: '⏱️ Women',
      headers: ['Position', 'Name', 'Activity', 'Time'],
      rows: calculateStageTime(stage, riders, women)
    }]

    output.stages.push({
      name: stage.name,
      profile: createProfile(stage),
      description: stage.description,
      results
    })
  })

  return output
}