const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()
const wsExp = require('express-ws')(app)
const port = 4000
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))
app.use('/', require('./router'))

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
