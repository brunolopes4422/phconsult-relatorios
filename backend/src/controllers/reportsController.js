const supabase = require('../lib/supabase')
const axios = require('axios')
const { getValidToken } = require('./clientsController')

const CA_BASE = 'https://api-v2.contaazul.com'
const ZAP_BASE = process.env.ZAP_BASE_URL
const ZAP_KEY = process.env.ZAP_API_KEY

function zapHeaders() {
  return { Authorization: `Bearer ${ZAP_KEY}` }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(value || 0)
}

function buildMessage(clientName, startDate, endDate, entradas, saidas, saldo) {
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
  return `Olá, ${clientName}!

Segue o fechamento financeiro referente ao período de ${fmt(startDate)} até ${fmt(endDate)}, conforme os dados fornecidos pelo cliente:

📈 Entradas: R$ ${formatCurrency(entradas)}
📉 Saídas: R$ ${formatCurrency(saidas)}
💰 Saldo final: R$ ${formatCurrency(saldo)}

Atenciosamente,
Equipe PH Consult Pro`
}

async function fetchAllPages(url, token, params) {
  let page = 1
  let all = []
  while (true) {
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: { ...params, pagina: page, tamanho_pagina: 100 }
    })
    const items = data?.itens || data?.content || data || []
    if (!Array.isArray(items) || items.length === 0) break
    all = all.concat(items)
    if (items.length < 100) break
    page++
  }
  return all
}

async function generate(req, res) {
  const { client_id, period_start, period_end } = req.body
  if (!client_id || !period_start || !period_end) {
    return res.status(400).json({ error: 'Campos obrigatórios: client_id, period_start, period_end' })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, ca_connected')
    .eq('id', client_id)
    .single()

  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (!client.ca_connected) return res.status(400).json({ error: 'Cliente não conectado ao Conta Azul' })

  try {
    const token = await getValidToken(client_id)
    const params = { data_vencimento_de: period_start, data_vencimento_ate: period_end }

    const [receber, pagar] = await Promise.all([
      fetchAllPages(`${CA_BASE}/v1/financeiro/eventos-financeiros/contas-a-receber/buscar`, token, params),
      fetchAllPages(`${CA_BASE}/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar`, token, params),
    ])

    const entradas = receber.reduce((sum, i) => sum + (i.valor || i.value || 0), 0)
    const saidas = pagar.reduce((sum, i) => sum + (i.valor || i.value || 0), 0)
    const saldo = entradas - saidas

    const message = buildMessage(client.name, period_start, period_end, entradas, saidas, saldo)

    res.json({
      client_id,
      client_name: client.name,
      period_start,
      period_end,
      entradas,
      saidas,
      saldo,
      message,
      raw: { receber_count: receber.length, pagar_count: pagar.length }
    })
  } catch (err) {
    console.error('Report generate error:', err.response?.data || err.message)
    res.status(500).json({ error: err.message })
  }
}

async function send(req, res) {
  const { client_id, period_start, period_end, entradas, saidas, saldo, message, recipients } = req.body

  if (!recipients || recipients.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um destinatário' })
  }

  const { data: configRow } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'zap_connection_id')
    .single()

  const connectionFrom = configRow?.value
  if (!connectionFrom) return res.status(400).json({ error: 'Conexão WhatsApp não configurada. Vá em Configurações.' })

  const results = []

  for (const r of recipients) {
    try {
      await axios.post(
        `${ZAP_BASE}/api/send/${r.phone}`,
        { body: message, connectionFrom },
        { headers: zapHeaders() }
      )
      results.push({ phone: r.phone, name: r.name, status: 'sent' })
    } catch (err) {
      console.error(`Zap send error for ${r.phone}:`, err.response?.data || err.message)
      results.push({ phone: r.phone, name: r.name, status: 'failed', error: err.message })
    }
  }

  const allSent = results.every(r => r.status === 'sent')

  await supabase.from('report_history').insert({
    client_id,
    period_start,
    period_end,
    entradas,
    saidas,
    saldo,
    message,
    send_status: allSent ? 'sent' : 'partial',
    sent_at: new Date().toISOString(),
  })

  res.json({ results, send_status: allSent ? 'sent' : 'partial' })
}

async function history(req, res) {
  const { data, error } = await supabase
    .from('report_history')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

module.exports = { generate, send, history }