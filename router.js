const router = require('express').Router()
const open = require('open')
const path = require('path')
const si = require('systeminformation')
const fse = require('fs-extra')
const { byTime, byUsage, setData, getMedian } = require('./utils/graphData')
const root = 'http://localhost:4000'
const hardware = 'desktop'
let interval
let usage
let currentBrowser = ''
let startSocket = null

/* Save start time, start measuring usage, and open application in a new browser instance */
router.ws('/timer/start', (ws, req) => {
  ws.on('message', async event => {
    startSocket = ws
    let json = {}
    const { browser, app, tech, time } = JSON.parse(event)
    currentBrowser = browser
    json = require(`./lib/${hardware}_${tech}.json`)

    if (json[browser] === undefined) {
      json[browser] = {}
    }
    if (json[browser][app] === undefined) {
      json[browser][app] = []
    }

    json[browser][app].push({ startTime: time, endTime: 0 })
    await fse.writeFile(
      path.join(__dirname, 'lib', `${hardware}_${tech}.json`),
      JSON.stringify(json, null, 2)
    )
    measureUsage()
    open(`${root}/${tech}/${app}`, { app: browser })
  })
})

router.ws('/timer/end', (ws, req) => {
  ws.on('message', async event => {
    handleEnd(JSON.parse(event))
  })
})

router.get('/timer/end', async (req, res) => {
  handleEnd(req.query)

  res.send('<h1>OK</h1>')
})

/* Saves the data after application is finished running. Also, sends graph data to base application. */
const handleEnd = async query => {
  const { tech, app, time, execTime } = query
  let json = {}
  clearInterval(interval)
  json = require(`./lib/${hardware}_${tech}.json`)
  json[currentBrowser][app][
    json[currentBrowser][app].length - 1
  ].endTime = parseInt(time)
  json[currentBrowser][app][
    json[currentBrowser][app].length - 1
  ].execTime = parseInt(execTime)
  json[currentBrowser][app][json[currentBrowser][app].length - 1].usage = usage
  await fse.writeFile(
    path.join(__dirname, 'lib', `${hardware}_${tech}.json`),
    JSON.stringify(json, null, 2)
  )

  const graph = await byTime(app, 'execTime')
  const loadTimeGraph = await byTime(app, 'loadTime')
  const cpuUsageGraph = await byUsage(app, 'cpu', hardware)
  const memUsageGraph = await byUsage(app, 'mem', hardware)
  startSocket.send(
    JSON.stringify({
      testFinished: true,
      graph,
      loadTimeGraph,
      cpuUsageGraph,
      memUsageGraph
    })
  )
}

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

router.get('/graph', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'graph', 'charts.html'))
})

/* Sends the requests data for the graph. */
router.ws('/graph', (ws, req) => {
  ws.on('message', async event => {
    const { app, tech, browser, metric } = JSON.parse(event)
    let graph

    if (metric === 'execTime' || metric === 'loadTime') {
      graph = await byTime(app, metric)
    } else if (metric === 'cpu' || metric === 'mem') {
      graph = await byUsage(app, metric, hardware)
    }

    ws.send(JSON.stringify({ graph, metric, app }))
  })
})

router.get('/:tech/fibonacci', (req, res) => {
  const { tech } = req.params

  res.sendFile(
    path.join(__dirname, 'public', tech, 'fibonacci', 'fibonacci.html')
  )
})

router.get('/:tech/array', (req, res) => {
  const { tech } = req.params

  res.sendFile(path.join(__dirname, 'public', tech, 'array', 'array.html'))
})

router.get('/:tech/numeric', (req, res) => {
  const { tech } = req.params

  res.sendFile(path.join(__dirname, 'public', tech, 'numeric', 'numeric.html'))
})

router.get('/average', async (req, res) => {
  await setData('numeric')
  res.send('<h1>OK</h1>')
})

/* Measures the cpu and memory usage every 500ms. */
const measureUsage = () => {
  usage = []
  interval = setInterval(async () => {
    const obj = {}

    obj.cpu = await cpuUsage()
    obj.mem = await memUsage()

    usage.push(obj)
  }, 500)
}

const cpuUsage = () => {
  return new Promise((resolve, reject) => {
    si.currentLoad(data => {
      const cpu = data.currentload

      if (cpu) {
        resolve(cpu)
      }
    })
  })
}

const memUsage = () => {
  return new Promise((resolve, reject) => {
    si.mem(data => {
      const mem = data.used

      if (mem) {
        resolve(mem)
      }
    })
  })
}

module.exports = router
