/*

This matcher makes it easier to write tests against Datadog metrics
by providing the `toHaveSentMetrics` matcher.

Examples:

it('makes sure a metric of a certain type and name was sent', async () => {
  await expect(async () => {
    await someCode()
  }).toHaveSentMetrics({
    name: 'jira-integration.my-metric',
    type: 'c', // c for count, h for histogram, etc
  })
})

it('checks value', async () => {
  await expect(async () => {
    await someCode()
  }).toHaveSentMetrics({
    name: 'jira-integration.my-metric',
    type: 'c',
    value: 1 // incremented by 1
  })
})

it('checks dynamic value', async () => {
  await expect(async () => {
    await someCode()
  }).toHaveSentMetrics({
    name: 'jira-integration.my-metric',
    type: 'c',
    value: (value) => value > 0 // make sure value is greater than 1
  })
})

it('checks tags too', async () => {
  await expect(async () => {
    await someCode()
  }).toHaveSentMetrics({
    name: 'jira-integration.my-metric',
    type: 'c',
    tags: { code: 200 } // will ensure that `code:200` is present
  })
})

*/
const statsd = require('../../../lib/config/statsd')
const diff = require('jest-diff')

const parseStatsdMessage = (stastsdMessage) => {
  const [metric, type, tagsString] = stastsdMessage.split('|')
  const [name, value] = metric.split(':')
  const tags = {}

  tagsString.substring(1).split(',').map((tagString) => {
    const [key, value] = tagString.split(':')
    tags[key] = value
  })

  return {
    name,
    value: parseInt(value),
    type,
    tags
  }
}

expect.extend({
  async toHaveSentMetrics (testFunction, ...expectedMetrics) {
    statsd.mockBuffer = []
    await testFunction()
    const actualMetrics = statsd.mockBuffer.map((message) => parseStatsdMessage(message))
    const matchingMetrics = []

    expectedMetrics.forEach((expectedMetric) => {
      return actualMetrics.find((actualMetric) => {
        const matchingName = actualMetric.name === expectedMetric.name
        const matchingType = actualMetric.type === expectedMetric.type

        let matchingValue = null
        if (typeof expectedMetric.value === 'function') {
          matchingValue = expectedMetric.value(actualMetric.value)
        } else {
          matchingValue = actualMetric.value === expectedMetric.value
        }

        if (matchingName && matchingType && matchingValue) {
          let matchingTags = true
          Object.entries(expectedMetric.tags).forEach(([name, expectedValue]) => {
            if (actualMetric.tags[name] !== expectedValue) {
              matchingTags = false
            }
          })

          if (matchingTags) {
            matchingMetrics.push(actualMetric)
          }
        }
      })
    })

    const pass = matchingMetrics.length === expectedMetrics.length

    return {
      message: () => {
        const diffString = diff(expectedMetrics, actualMetrics, { expand: true })
        return this.utils.matcherHint('toHaveSentMetrics', 'function', 'metrics') + `\n\n${diffString}`
      },
      pass
    }
  }
})
