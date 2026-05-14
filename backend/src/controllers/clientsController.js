const supabase = require('../lib/supabase')
const axios = require('axios')

async function list(req, res) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, status, ca_connected, ca_token_expires_at, documento')
    .order('name')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function get(req, res) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, status, ca_connected, ca_token_expires_at, documento')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(404).json({ error: 'Cliente não encontrado' })
  res.json(data)
}

async function getPublicClient(req, res) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, ca_connected')
    .eq('id', req.params.id)
    .single()
  if (error || !data) return res.status(404).json({ error: 'Cliente não encontrado' })
  res.json(data)
}

async function create(req, res) {
  const { name, status } = req.body
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' })
  const { data, error } = await supabase
    .from('clients')
    .insert({ name, status: status || 'active' })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

async function update(req, res) {
  const { name, status } = req.body
  const { data, error } = await supabase
    .from('clients')
    .update({ name, status })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function remove(req, res) {
  const { error } = await supabase.from('clients').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Cliente removido' })
}

function caAuthUrl(req, res) {
  const clientId = req.params.id
  const url = `https://auth.contaazul.com/login` +
    `?response_type=code` +
    `&client_id=${process.env.CA_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.CA_REDIRECT_URI)}` +
    `&scope=openid+profile` +
    `&state=${clientId}`
  res.json({ url })
}

async function caCallback(req, res) {
  const { code, state: clientId } = req.query
  if (!code || !clientId) return res.status(400).json({ error: 'Parâmetros inválidos' })

  try {
    const basicAuth = Buffer.from(`${process.env.CA_CLIENT_ID}:${process.env.CA_CLIENT_SECRET}`).toString('base64')

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.CA_REDIRECT_URI,
    })

    const { data: tokens } = await axios.post(
      'https://auth.contaazul.com/oauth2/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`,
        }
      }
    )

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Busca dados da empresa conectada
    const { data: empresa } = await axios.get(
      'https://api-v2.contaazul.com/v1/pessoas/conta-conectada',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )

    const nome = empresa.nome_fantasia || empresa.razao_social

    await supabase.from('clients').update({
      ca_access_token: tokens.access_token,
      ca_refresh_token: tokens.refresh_token,
      ca_token_expires_at: expiresAt,
      ca_connected: true,
      documento: empresa.documento,
      razao_social: empresa.razao_social,
      name: nome,
    }).eq('id', clientId)

    res.json({ message: 'Conta Azul conectada com sucesso' })
  } catch (err) {
    console.error('CA OAuth error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Erro ao conectar Conta Azul' })
  }
}

async function refreshToken(clientId) {
  const { data: client } = await supabase
    .from('clients')
    .select('ca_refresh_token')
    .eq('id', clientId)
    .single()

  if (!client?.ca_refresh_token) throw new Error('Sem refresh token')

  const basicAuth = Buffer.from(`${process.env.CA_CLIENT_ID}:${process.env.CA_CLIENT_SECRET}`).toString('base64')

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: client.ca_refresh_token,
  })

  const { data: tokens } = await axios.post(
    'https://auth.contaazul.com/oauth2/token',
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      }
    }
  )

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('clients').update({
    ca_access_token: tokens.access_token,
    ca_refresh_token: tokens.refresh_token,
    ca_token_expires_at: expiresAt,
  }).eq('id', clientId)

  return tokens.access_token
}

async function getValidToken(clientId) {
  const { data: client } = await supabase
    .from('clients')
    .select('ca_access_token, ca_token_expires_at, ca_connected')
    .eq('id', clientId)
    .single()

  if (!client?.ca_connected) throw new Error('Cliente não conectado ao Conta Azul')

  const expiresAt = new Date(client.ca_token_expires_at)
  const now = new Date()
  const fiveMin = 5 * 60 * 1000

  if (expiresAt - now < fiveMin) {
    return await refreshToken(clientId)
  }

  return client.ca_access_token
}

module.exports = { list, get, create, update, remove, caAuthUrl, caCallback, getValidToken, getPublicClient }