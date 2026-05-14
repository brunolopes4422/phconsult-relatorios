const supabase = require('../lib/supabase')
const axios = require('axios')

async function getConnections(req, res) {
  try {
    const { data } = await axios.get(`${process.env.ZAP_BASE_URL}/api/connections`, {
      headers: { 'x-api-key': process.env.ZAP_API_KEY }
    })
    res.json(data)
  } catch (err) {
    console.error('Zap connections error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Erro ao buscar conexões WhatsApp' })
  }
}

async function getConfig(req, res) {
  const { data } = await supabase.from('config').select('key, value')
  const result = {}
  for (const row of data || []) result[row.key] = row.value
  res.json(result)
}

async function setConfig(req, res) {
  const { key, value } = req.body
  if (!key) return res.status(400).json({ error: 'Key obrigatória' })
  const { error } = await supabase
    .from('config')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ key, value })
}

module.exports = { getConnections, getConfig, setConfig }
