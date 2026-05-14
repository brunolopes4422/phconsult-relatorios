require('dotenv').config()
const express = require('express')
const cors = require('cors')
const routes = require('./routes')

const app = express()

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173'],
  credentials: true
}))
app.use(express.json())

app.use('/api', routes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`PH Consult Pro backend rodando na porta ${PORT}`))
