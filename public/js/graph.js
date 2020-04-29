const socket = new WebSocket('ws://localhost:4000/graph')

socket.addEventListener('message', event => {
  const { graph, metric, app } = JSON.parse(event.data)
  let label = ''
  let xLabel = ''
  let yLabel = ''

  if (metric === 'loadTime' || metric === 'execTime') {
    yLabel = 'time (ms)'
    xLabel = 'technologies'
    if (metric === 'loadTime') {
      label = `${app}: load time`
    } else if (metric === 'execTime') {
      label = `${app}: execution time`
    }

    renderTimeGraph(graph, 'graph', label, xLabel, yLabel)
  } else if (metric === 'cpu' || metric === 'mem') {
    xLabel = 'time (ms)'
    if (metric === 'cpu') {
      yLabel = 'CPU usage (%)'
    } else {
      yLabel = 'Memory usage (MB)'
    }
    renderUsageGraph(graph, 'graph', xLabel, yLabel)
  }
})

const renderGraph = event => {
  const app = document.querySelector('#app-select').value
  const tech = document.querySelector('#tech-select').value
  const browser = document.querySelector('#browser-select').value
  const metric = document.querySelector('#metric-select').value
  const link = document.querySelector('#link')
  if (link !== null) {
    link.remove()
  }
  const obj = { app, tech, browser, metric }
  socket.send(JSON.stringify(obj))
}
