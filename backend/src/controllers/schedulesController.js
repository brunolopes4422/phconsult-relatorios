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

function getPeriod(periodType) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  if (periodType === 'day') {
    return { start: today, end: today }
  }
  if (periodType === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - 7)
    return { start: start.toISOString().split('T')[0], end: today }
  }
  if (periodType === 'biweek') {
    const start = new Date(now)
    start.setDate(now.getDate() - 15)
    return { start: start.toISOString().split('T')[0], end: today }
  }
  // month default
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return { start: start.toISOString().split('T')[0], end: today }
}

function shouldRun(schedule) {
  const now = new Date()
  const [hour, minute] = schedule.send_time.split(':').map(Number)
  const nowHour = now.getUTCHours() - 3 // BRT
  const nowMinute = now.getUTCMinutes()
  const nowDay = now.getDay()
  const nowDate = now.getDate()

  // Verifica horário (janela de 1 hora)
  if (nowHour !== hour) return false

  // Verifica se já rodou hoje
  if (schedule.last_run) {
    const lastRun = new Date(schedule.last_run)
    const lastRunDate = lastRun.toISOString().split('T')[0]
    const todayStr = now.toISOString().split('T')[0]
    if (lastRunDate === todayStr) return false
  }

  if (schedule.frequency === 'daily_morning' || schedule.frequency === 'daily_evening') {
    return true
  }
  if (schedule.frequency === 'weekly') {
    return nowDay === (schedule.day_of_week || 5) // sexta por padrão
  }
  if (schedule.frequency === 'biweekly') {
    return nowDate === 15 || nowDate === (schedule.day_of_month || 30)
  }
  if (schedule.frequency === 'monthly') {
    return nowDate === (schedule.day_of_month || 1)
  }
  return false
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

async function runCron(req, res) {
  // Verifica secret para segurança
  const secret = req.headers['x-cron-secret']
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, clients(id, name, ca_connected)')
    .eq('active', true)

  const results = []

  for (const schedule of schedules || []) {
    if (!shouldRun(schedule)) continue
    if (!schedule.clients?.ca_connected) continue

    try {
      const token = await getValidToken(schedule.client_id)
      const { start, end } = getPeriod(schedule.period_type)
      const params = { data_vencimento_de: start, data_vencimento_ate: end }

      const [receber, pagar] = await Promise.all([
        fetchAllPages(`${CA_BASE}/v1/financeiro/eventos-financeiros/contas-a-receber/buscar`, token, params),
        fetchAllPages(`${CA_BASE}/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar`, token, params),
      ])

      const entradas = receber.reduce((sum, i) => sum + (i.total || 0), 0)
      const saidas = pagar.reduce((sum, i) => sum + (i.total || 0), 0)
      const saldo = entradas - saidas

      // Busca destinatários ativos
      const { data: recipients } = await supabase
        .from('recipients')
        .select('*')
        .eq('client_id', schedule.client_id)
        .eq('active', true)

      if (!recipients || recipients.length === 0) {
        results.push({ client: schedule.clients.name, status: 'skipped', reason: 'sem destinatários' })
        continue
      }

      // Busca conexão WhatsApp
      const { data: configRow } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'zap_connection_id')
        .single()

      const connectionFrom = configRow?.value
      if (!connectionFrom) {
        results.push({ client: schedule.clients.name, status: 'skipped', reason: 'sem conexão WhatsApp' })
        continue
      }

      const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')

      for (const r of recipients) {
        const message = `Olá, ${r.name}!

Segue o fechamento financeiro referente ao período de ${fmt(start)} até ${fmt(end)}, conforme os lançamentos registrados no Conta Azul:

📈 Entradas: R$ ${formatCurrency(entradas)}
📉 Saídas: R$ ${formatCurrency(saidas)}
💰 Saldo final: R$ ${formatCurrency(saldo)}

Atenciosamente,
Equipe PH Consult Pro`

        await axios.post(
          `${ZAP_BASE}/api/send/${r.phone}`,
          { body: message, connectionFrom },
          { headers: zapHeaders() }
        )
      }

      // Salva histórico
      const message = `Olá, [destinatários]!\n\nFechamento de ${fmt(start)} até ${fmt(end)}\n📈 Entradas: R$ ${formatCurrency(entradas)}\n📉 Saídas: R$ ${formatCurrency(saidas)}\n💰 Saldo: R$ ${formatCurrency(saldo)}`

      await supabase.from('report_history').insert({
        client_id: schedule.client_id,
        period_start: start,
        period_end: end,
        entradas,
        saidas,
        saldo,
        message,
        send_status: 'sent',
        sent_at: new Date().toISOString(),
      })

      // Atualiza last_run
      await supabase.from('schedules').update({ last_run: new Date().toISOString() }).eq('id', schedule.id)

      results.push({ client: schedule.clients.name, status: 'sent' })
    } catch (err) {
      console.error(`Cron error for ${schedule.clients?.name}:`, err.message)
      results.push({ client: schedule.clients?.name, status: 'error', error: err.message })
    }
  }

  res.json({ ran: results.length, results })
}

async function list(req, res) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('client_id', req.params.clientId)
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function create(req, res) {
  const { frequency, send_time, day_of_week, day_of_month, period_type } = req.body
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      client_id: req.params.clientId,
      frequency,
      send_time: send_time || '08:00',
      day_of_week,
      day_of_month,
      period_type: period_type || 'month',
    })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

async function update(req, res) {
  const { frequency, send_time, day_of_week, day_of_month, period_type, active } = req.body
  const { data, error } = await supabase
    .from('schedules')
    .update({ frequency, send_time, day_of_week, day_of_month, period_type, active })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function remove(req, res) {
  const { error } = await supabase.from('schedules').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Agendamento removido' })
}

module.exports = { runCron, list, create, update, remove }