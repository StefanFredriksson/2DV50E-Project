const fse = require('fs-extra')
const path = require('path')

const getFiles = async () => {
  const files = await fse.readdir(path.join(__dirname, '..', 'lib'))
  return files
}

const setData = async app => {
  const files = await getFiles()
  const data = []

  for (const file of files) {
    const json = require(`../lib/${file}`)
    const keys = Object.keys(json)
    const tech = file.split('.')[0]
    const obj = { tech, load: '', exec: '', cpu: '', mem: '' }

    for (const key of keys) {
      if (Array.isArray(json[key][app])) {
        for (const j of json[key][app]) {
          if (j.endTime !== 0) {
            const startTime = j.startTime
            const endTime = j.endTime
            const loadTime = endTime - startTime
            obj.load += loadTime + ', '
            obj.exec += j.execTime + ', '
            obj.cpu += getMean(j.usage, 'cpu') + ', '
            obj.mem += getMean(j.usage, 'mem') + ', '
          }
        }
      }
    }

    data.push(obj)
  }

  await fse.writeFile(
    path.join(__dirname, '..', 'data', `${app}_data.json`),
    JSON.stringify(data, null, 2)
  )
}

const getMean = (data, metric) => {
  let sum = 0

  for (const d of data) {
    sum += d[metric]
  }

  return sum / data.length
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

const byTime = async (app, metric) => {
  const files = await getFiles()
  const graphData = { labels: [], data: [] }

  for (const file of files) {
    const json = require(`../lib/${file}`)
    const keys = Object.keys(json)
    const tech = file.split('.')
    const times = []
    graphData.labels.push(tech[0])

    for (const key of keys) {
      if (Array.isArray(json[key][app])) {
        for (const data of json[key][app]) {
          if (data.endTime && metric === 'loadTime') {
            times.push(data.endTime - data.startTime)
          } else if (data.execTime && metric === 'execTime') {
            times.push(data.execTime)
          }
        }
      }
    }

    graphData.data.push(getMedian(times))
  }

  return graphData
}

const byLoadTime = async app => {
  const files = await getFiles()
  const graphData = { labels: [], data: [] }

  for (const file of files) {
    const json = require(`../lib/${file}`)
    const keys = Object.keys(json)
    const tech = file.split('.')
    const loadTimes = []
    graphData.labels.push(tech[0])

    for (const key of keys) {
      if (Array.isArray(json[key][app])) {
        for (const data of json[key][app]) {
          if (data.endTime) {
            loadTimes.push(data.endTime - data.startTime)
          }
        }
      }
    }

    graphData.data.push(getMedian(loadTimes))
  }

  return graphData
}

const byExecTime = async app => {
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
          if (data.execTime) {
            execTimes.push(data.execTime)
          }
        }
      }
    }

    graphData.data.push(getMedian(execTimes))
  }

  return graphData
}

const byUsage = async (app, metric) => {
  const colors = {
    wasm: 'rgb(255, 166, 0)',
    asm: 'rgb(0, 0, 0)',
    pnacl: 'rgb(2, 136, 2)',
    applet: 'rgb(5, 5, 250)',
    activex: 'rgb(253, 4, 4)'
  }
  const files = await getFiles()
  const graphData = { labels: [], datasets: [] }
  let max = 0

  for (const file of files) {
    const json = require(`../lib/${file}`)
    const keys = Object.keys(json)
    const tech = file.split('.')
    const obj = {
      label: tech[0],
      borderColor: colors[tech[0]],
      fill: false,
      data: []
    }
    const usage = []

    for (const key of keys) {
      if (Array.isArray(json[key][app])) {
        for (const data of json[key][app]) {
          if (data.usage) {
            usage.push(data.usage)
          }
        }
      }
    }

    obj.data = getUsageMedian(usage, metric)
    if (obj.data.length > max) {
      max = obj.data.length
    }
    graphData.datasets.push(obj)
  }

  for (let i = 1; i <= max; i++) {
    graphData.labels.push(i * 500 + '')
  }

  return graphData
}

const getUsageMedian = (usage, metric) => {
  const median = []
  let max = 0
  for (let i = 0; i < usage.length; i++) {
    if (usage[i].length > max) {
      max = usage[i].length
    }
  }

  for (let i = 0; i < max; i++) {
    const use = []
    for (let j = 0; j < usage.length; j++) {
      if (usage[j].length > i) {
        let val = usage[j][i][metric]
        if (metric === 'mem') {
          val /= 1000000
        }
        use.push(val)
      }
    }
    median.push(getMedian(use))
  }

  return median
}

module.exports = {
  byTime,
  byExecTime,
  byLoadTime,
  byUsage,
  setData
}
