const techSelect = document.querySelector('#tech-select')
const browserSelect = document.querySelector('#browser-select')

techSelect.addEventListener('change', event => {
  populateBrowser()
})

const populateBrowser = () => {
  const browsers = getBrowsers(techSelect.value)
  browserSelect.innerHTML = ''

  if (!techSelect.value !== 'all') {
    for (const browser of browsers) {
      const option = document.createElement('option')
      option.setAttribute('value', browser.value)
      option.textContent = browser.label
      browserSelect.appendChild(option)
    }
  }
}

const getBrowsers = tech => {
  const data = {
    wasm: [
      { label: 'Google Chrome', value: 'chrome' },
      { label: 'Firefox', value: 'firefox' },
      { label: 'Microsoft Edge', value: 'msedge' }
    ],
    asm: [
      { label: 'Google Chrome', value: 'chrome' },
      { label: 'Firefox', value: 'firefox' },
      { label: 'Microsoft Edge', value: 'msedge' }
    ],
    pnacl: [{ label: 'Google Chrome', value: 'chrome' }],
    applet: [{ label: 'Internet Explorer', value: 'iexplore' }],
    activex: [{ label: 'Internet Explorer', value: 'iexplore' }]
  }

  return data[tech]
}
