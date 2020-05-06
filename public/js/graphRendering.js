let chart = null

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

const renderTimeGraph = (data, id, label, xLabel, yLabel) => {
  var ctx = document.getElementById(id).getContext('2d')

  if (chart) {
    chart.destroy()
  }

  const options = {
    animation: {
      onComplete: done
    },
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

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label,
          backgroundColor: 'rgb(55, 55, 133)',
          borderColor: 'rgb(135, 135, 248)',
          data: data.data
        }
      ]
    },
    display: true,
    options
  })
}

const renderUsageGraph = (data, id, xLabel, yLabel) => {
  var ctx = document.getElementById(id).getContext('2d')

  if (chart) {
    chart.destroy()
  }

  const options = {
    animation: {
      onComplete: done
    },
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

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: data.datasets
    },
    options
  })
}

const renderExecGraph = data => {
  var ctx = document.getElementById('exec-chart-container').getContext('2d')

  if (execChart) {
    execChart.destroy()
  }

  execChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: `${app}: execution time`,
          backgroundColor: 'rgb(55, 55, 133)',
          borderColor: 'rgb(135, 135, 248)',
          data: data.data
        }
      ]
    }
  })
}

const renderLoadTimeGraph = data => {
  var ctx = document.getElementById('load-chart-container').getContext('2d')

  if (loadChart) {
    loadChart.destroy()
  }

  loadChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: `${app}: load time`,
          backgroundColor: 'rgb(55, 55, 133)',
          borderColor: 'rgb(135, 135, 248)',
          data: data.data
        }
      ]
    }
  })
}

const renderCpuUsageGraph = data => {
  var ctx = document.getElementById('cpu-usage-container').getContext('2d')

  if (cpuUsageChart) {
    cpuUsageChart.destroy()
  }

  cpuUsageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: data.datasets
    }
  })
}

const renderMemUsageGraph = data => {
  var ctx = document.getElementById('mem-usage-container').getContext('2d')

  if (memUsageChart) {
    memUsageChart.destroy()
  }

  memUsageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: data.datasets
    }
  })
}
