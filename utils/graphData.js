const fse = require('fs-extra')
const path = require('path')

const getFiles = async () => {
  const files = await fse.readdir(path.join(__dirname, '..', 'lib'))
  return files
}

const getMedian = data => {
  if (data.length === 0) {
    return 0
  }

  let median = 0
  data = data.sort((a, b) => {
    return a - b
  })

  if (data.length % 2 === 0) {
    const middle = data.length / 2
    median = (data[middle] + data[middle - 1]) / 2
  } else {
    const middle = Math.floor(data.length / 2)
    median = data[middle]
  }

  return median
}

const byTechnology = async app => {
  const files = await getFiles()
  const graphData = { labels: [], data: [] }

  for (const file of files) {
    const json = require(`../lib/${file}`)
    const keys = Object.keys(json)
    const tech = file.split('.')
    const execTimes = []
    graphData.labels.push(tech[0])

    for (const key of keys) {
      if (Array.isArray(json[key][app])) {
        for (const data of json[key][app]) {
          execTimes.push(data.execTime)
        }
      }
    }

    graphData.data.push(getMedian(execTimes))
  }

  return graphData
}

module.exports = {
  byTechnology
}
