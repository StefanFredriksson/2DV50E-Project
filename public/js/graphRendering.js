let chart = null
let execChart = null
let loadChart = null
let cpuChart = null
let memChart = null

const done = () => {
  let a = document.querySelector('#link')

  if (a === null) {
    a = document.createElement('a')
    a.setAttribute('id', 'link')
    a.setAttribute('download', 'filename.png')
    a.textContent = 'Save as image'
    document.querySelector('#link-div').appendChild(a)
  }
  const url = document.querySelector('#graph').toDataURL('image/png')
  a.href = url
}

const renderTimeGraph = (data, id, label, xLabel, yLabel, isTests) => {
  var ctx = document.getElementById(id).getContext('2d')
  destroyChart(id)

  const options = {
    scales: {
      yAxes: [
        {
          scaleLabel: {
            display: true,
            labelString: yLabel
          },
          ticks: {
            beginAtZero: true
          }
        }
      ],
      xAxes: [
        {
          scaleLabel: {
            display: true,
            labelString: xLabel
          }
        }
      ]
    }
  }

  if (!isTests) {
    options.animation = {
      onComplete: done
    }
  }

  const c = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: data.data
    },
    display: true,
    options
  })

  setChart(id, c)
}

const renderUsageGraph = (data, id, xLabel, yLabel, isTests) => {
  var ctx = document.getElementById(id).getContext('2d')
  destroyChart(id)

  const options = {
    scales: {
      yAxes: [
        {
          scaleLabel: {
            display: true,
            labelString: yLabel
          }
        }
      ],
      xAxes: [
        {
          scaleLabel: {
            display: true,
            labelString: xLabel
          }
        }
      ]
    }
  }

  if (!isTests) {
    options.animation = {
      onComplete: done
    }
  }

  const c = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: data.datasets
    },
    options
  })

  setChart(id, c)
}

const setChart = (id, c) => {
  if (id === 'graph') {
    chart = c
  } else if (id === 'exec-chart-container') {
    execChart = c
  } else if (id === 'load-chart-container') {
    loadChart = c
  } else if (id === 'cpu-usage-container') {
    cpuChart = c
  } else if (id === 'mem-usage-container') {
    memChart = c
  }
}

const destroyChart = id => {
  if (id === 'graph') {
    if (chart) {
      chart.destroy()
    }
  } else if (id === 'exec-chart-container') {
    if (execChart) {
      execChart.destroy()
    }
  } else if (id === 'load-chart-container') {
    if (loadChart) {
      loadChart.destroy()
    }
  } else if (id === 'cpu-usage-container') {
    if (cpuChart) {
      cpuChart.destroy()
    }
  } else if (id === 'mem-usage-container') {
    if (memChart) {
      memChart.destroy()
    }
  }
}
