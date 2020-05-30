const fse = require('fs-extra')
const path = require('path')

const getFiles = async () => {
  const files = await fse.readdir(path.join(__dirname, '..', 'lib'))
  return files
}

/** Extracts the data from the main files and adds it in to a new file
in a way that is easy to copy pase, for use when calculating the statistically signficant difference. */
const setData = async app => {
  const files = await getFiles()
  const data = []

  for (const file of files) {
    const json = require(`../lib/${file}`)
    const keys = Object.keys(json)
    const obj = { tech: '', load: '', exec: '', cpu: '', mem: '' }

    for (const key of keys) {
      const t = file.split('.')[0]
      const hardware = t.split('_')[0]
      const tech = t.split('_')[1]
      obj.tech = `${hardware}: ${tech}`
      if (Array.isArray(json[key][app])) {
        for (const j of json[key][app]) {
          if (j.endTime !== 0) {
            const startTime = j.startTime
            const endTime = j.endTime
            const loadTime = endTime - startTime
            obj.load += loadTime + ', '
            obj.exec += j.execTime + ', '
            if (j.usage.length > 0) {
              obj.cpu += getMean(j.usage, 'cpu') + ', '
              const mem = getMean(j.usage, 'mem') / 1000000
              obj.mem += mem + ', '
            }
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

/** Returns the data for either execution time or load time that can be used
to display the data in a graph. */
const byTime = async (app, metric) => {
  const files = await getFiles()
  const graphData = { labels: [], data: [] }
  const platform = {
    desktop: {
      color: '#3e95cd',
      label: 'Desktop',
      data: []
    },
    laptop: {
      color: '#8e5ea2',
      label: 'Laptop',
      data: []
    }
  }

  for (const file of files) {
    const json = require(`../lib/${file}`)
    const keys = Object.keys(json)
    const t = file.split('.')[0]
    const d = t.split('_')
    const borderColor =
      d[0] === 'desktop' ? 'rgb(255, 166, 0)' : 'rgb(2, 136, 2)'
    const times = []

    if (!graphData.labels.includes(d[1])) {
      graphData.labels.push(d[1])
    }

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

    platform[d[0]].data.push(getMedian(times))
  }

  const keys = Object.keys(platform)

  for (const key of keys) {
    const obj = {
      borderColor: platform[key].color,
      backgroundColor: platform[key].color,
      label: platform[key].label,
      data: platform[key].data
    }

    graphData.data.push(obj)
  }

  return graphData
}

/** Returns the data for either the cpu usage or the memory usage
 * and the data can be used to display in a graph.
 */
const byUsage = async (app, metric, hardware) => {
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
    const h = file.split('.')[0].split('_')[0]
    if (h !== hardware) {
      continue
    }
    const json = require(`../lib/${file}`)
    const keys = Object.keys(json)
    const tech = file.split('.')[0].split('_')[1]
    const obj = {
      label: tech,
      borderColor: colors[tech],
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
  const lengths = []
  for (let i = 0; i < usage.length; i++) {
    if (usage[i].length > max) {
      max = usage[i].length
    }
  }

  for (let i = 0; i < usage.length; i++) {
    lengths.push(usage[i].length)
  }

  const medianLength = getMedian(lengths)

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
  byUsage,
  setData,
  getMedian
}
