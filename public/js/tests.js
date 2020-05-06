populateBrowser()
let maxTests = 1
const socket = new WebSocket('ws://localhost:4000/timer/start')
let tech = ''
let app = ''
let browser = ''
let testCount = 0
let execChart = null
let loadChart = null
let cpuUsageChart = null
let memUsageChart = null

socket.addEventListener('message', async event => {
  const {
    testFinished,
    graph,
    loadTimeGraph,
    cpuUsageGraph,
    memUsageGraph
  } = JSON.parse(event.data)

  if (!testFinished) {
    fetch(`http://localhost:4000/start/${tech}/${app}/${browser}`)
  } else {
    if (testCount < maxTests) {
      startTests()
    } else {
      const button = document.querySelector('#start-tests')
      const status = document.querySelector('#status')
      status.textContent = 'Status: FINISHED'
      button.disabled = false
      renderExecGraph(graph)
      renderLoadTimeGraph(loadTimeGraph)
      renderCpuUsageGraph(cpuUsageGraph)
      renderMemUsageGraph(memUsageGraph)
    }
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
