const router = require('express').Router()
const open = require('open')
const path = require('path')
const si = require('systeminformation')
const fse = require('fs-extra')
const {
  byTime,
  byExecTime,
  byLoadTime,
  byUsage,
  setData
} = require('./utils/graphData')
const root = 'http://localhost:4000'
let interval
let usage
let currentBrowser = ''
let startSocket = null

router.ws('/timer/start', (ws, req) => {
  ws.on('message', async event => {
    startSocket = ws
    let json = {}
    const { browser, app, tech, time } = JSON.parse(event)
    currentBrowser = browser
    json = require(`./lib/${tech}.json`)

    if (json[browser] === undefined) {
      json[browser] = {}
    }
    if (json[browser][app] === undefined) {
      json[browser][app] = []
    }

    json[browser][app].push({ startTime: time, endTime: 0 })
    await fse.writeFile(
      path.join(__dirname, 'lib', `${tech}.json`),
      JSON.stringify(json, null, 2)
    )
    measureUsage()
    open(`${root}/${tech}/${app}`, { app: browser })
    //ws.send(JSON.stringify({ testFinished: false }))
  })
})

router.ws('/timer/end', (ws, req) => {
  ws.on('message', async event => {
    let json = {}
    clearInterval(interval)
    const data = JSON.parse(event)
    json = require(`./lib/${data.tech}.json`)
    json[currentBrowser][data.app][
      json[currentBrowser][data.app].length - 1
    ].endTime = data.time
    json[currentBrowser][data.app][
      json[currentBrowser][data.app].length - 1
    ].execTime = data.execTime
    json[currentBrowser][data.app][
      json[currentBrowser][data.app].length - 1
    ].usage = usage
    await fse.writeFile(
      path.join(__dirname, 'lib', `${data.tech}.json`),
      JSON.stringify(json, null, 2)
    )

    const graph = await byExecTime(data.app)
    const loadTimeGraph = await byLoadTime(data.app)
    const cpuUsageGraph = await byUsage(data.app, 'cpu')
    const memUsageGraph = await byUsage(data.app, 'mem')

    startSocket.send(
      JSON.stringify({
        testFinished: true,
        graph,
        loadTimeGraph,
        cpuUsageGraph,
        memUsageGraph
      })
    )
  })
})

router.get('/timer/end', async (req, res) => {
  const { tech, app, time, execTime } = req.query
  let json = {}
  clearInterval(interval)
  json = require(`./lib/${tech}.json`)
  json[currentBrowser][app][
    json[currentBrowser][app].length - 1
  ].endTime = parseInt(time)
  json[currentBrowser][app][
    json[currentBrowser][app].length - 1
  ].execTime = parseInt(execTime)
  json[currentBrowser][app][json[currentBrowser][app].length - 1].usage = usage
  await fse.writeFile(
    path.join(__dirname, 'lib', `${tech}.json`),
    JSON.stringify(json, null, 2)
  )

  const graph = await byExecTime(app)
  const loadTimeGraph = await byLoadTime(app)
  const cpuUsageGraph = await byUsage(app, 'cpu')
  const memUsageGraph = await byUsage(app, 'mem')
  startSocket.send(
    JSON.stringify({
      testFinished: true,
      graph,
      loadTimeGraph,
      cpuUsageGraph,
      memUsageGraph
    })
  )

  res.send('<h1>OK</h1>')
})

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

router.get('/graph', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'graph', 'charts.html'))
})

router.ws('/graph', (ws, req) => {
  ws.on('message', async event => {
    const { app, tech, browser, metric } = JSON.parse(event)
    let graph

    if (metric === 'execTime' || metric === 'loadTime') {
      graph = await byTime(app, metric)
    } else if (metric === 'cpu' || metric === 'mem') {
      graph = await byUsage(app, metric)
    }

    ws.send(JSON.stringify({ graph, metric, app }))
  })
})

router.get('/start/:tech/:app/:browser', async (req, res) => {
  const { tech, app, browser } = req.params

  open(`${root}/${tech}/${app}`, { app: browser })

  res.json({ message: 'OK' })
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
