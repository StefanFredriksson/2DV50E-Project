const router = require('express').Router()
const open = require('open')
const path = require('path')
const si = require('systeminformation')
const fse = require('fs-extra')
const root = 'http://localhost:4000'
let interval
let usage

router.ws('/timer/start', (ws, req) => {
  ws.on('message', async event => {
    let json = {}
    const data = JSON.parse(event)
    json = require(`./lib/${data.tech}.json`)
    json[data.app].push({ startTime: data.time, endTime: 0 })
    await fse.writeFile(
      path.join(__dirname, 'lib', `${data.tech}.json`),
      JSON.stringify(json, null, 2)
    )
    measureUsage()
    ws.send('message')
  })
})

router.ws('/timer/end', (ws, req) => {
  ws.on('message', async event => {
    let json = {}
    clearInterval(interval)
    const data = JSON.parse(event)
    json = require(`./lib/${data.tech}.json`)
    json[data.app][json[data.app].length - 1].endTime = data.time
    json[data.app][json[data.app].length - 1].usage = usage
    await fse.writeFile(
      path.join(__dirname, 'lib', `${data.tech}.json`),
      JSON.stringify(json, null, 2)
    )
  })
})

router.get('/timer/end', async (req, res) => {
  const { tech, app, time } = req.query
  let json = {}
  clearInterval(interval)

  json = require(`./lib/${tech}.json`)
  json[app][json[app].length - 1].endTime = parseInt(time)
  json[app][json[app].length - 1].usage = usage
  await fse.writeFile(
    path.join(__dirname, 'lib', `${tech}.json`),
    JSON.stringify(json, null, 2)
  )

  res.json({ message: 'OK' })
})

router.get('/', (req, res) => {
  res.sendFile(__dirname, 'public', 'index.html')
})

router.get('/start/:tech/:app', async (req, res) => {
  const { tech, app } = req.params

  if (tech !== 'applet' && tech !== 'activex') {
    open(`${root}/${tech}/${app}`)
  } else {
    open(`${root}/${tech}/${app}`, { app: 'iexplore' })
  }

  res.json({ message: 'OK' })
})

router.get('/wasm/fibonacci', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'wasm', 'Fibonacci', 'fibonacci.html')
  )
})

router.get('/asm/fibonacci', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'asm', 'Fibonacci', 'fibonacci.html')
  )
})

router.get('/pnacl/fibonacci', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'pnacl', 'Fibonacci', 'fibonacci.html')
  )
})

router.get('/applet/fibonacci', async (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'applet', 'Fibonacci', 'index.html')
  )
})

router.get('/activex/fibonacci', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'activex', 'fibonacci', 'FibonacciCtl.html')
  )
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
