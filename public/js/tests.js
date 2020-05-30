populateBrowser()
let maxTests = 1
const socket = new WebSocket('ws://localhost:4000/timer/start')
let tech = ''
let app = ''
let browser = ''
let testCount = 0

socket.addEventListener('message', async event => {
  const {
    testFinished,
    graph,
    loadTimeGraph,
    cpuUsageGraph,
    memUsageGraph
  } = JSON.parse(event.data)

  if (testCount < maxTests) {
    startTests()
  } else {
    const button = document.querySelector('#start-tests')
    const status = document.querySelector('#status')
    status.textContent = 'Status: FINISHED'
    button.disabled = false

    renderTimeGraph(
      graph,
      'exec-chart-container',
      `${app}: execution time`,
      'technologies',
      'time (ms)',
      true
    )
    renderTimeGraph(
      loadTimeGraph,
      'load-chart-container',
      `${app}: load time`,
      'technologies',
      'time (ms)',
      true
    )
    renderUsageGraph(
      cpuUsageGraph,
      'cpu-usage-container',
      'time (ms)',
      'CPU usage (%)',
      true
    )
    renderUsageGraph(
      memUsageGraph,
      'mem-usage-container',
      'time (ms)',
      'Memory usage (MB)',
      true
    )
  }
})

const startTests = () => {
  testCount++
  tech = document.querySelector('#tech-select').value
  app = document.querySelector('#app-select').value
  browser = document.querySelector('#browser-select').value
  const status = document.querySelector('#status')
  const button = document.querySelector('#start-tests')
  button.disabled = true
  status.textContent = 'Status: RUNNING'
  const date = new Date()
  const time = date.getTime()
  socket.send(JSON.stringify({ tech, app, browser, time }))
}

const runTests = () => {
  maxTests = parseInt(document.querySelector('#nr-of-tests').value)

  if (!maxTests) {
    maxTests = 1
  }

  testCount = 0
  startTests()
}
