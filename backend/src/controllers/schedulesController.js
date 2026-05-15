const supabase = require('../lib/supabase')
const { generate: generateReport, send: sendReport } = require('./reportsController')

function getPeriod(periodType) {
  const now = new Date()
  const nowBR = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const today = nowBR.toISOString().split('T')[0]

  if (periodType === 'day') {
    return { start: today, end: today }
  }
  if (periodType === 'week') {
    const start = new Date(nowBR)
    start.setDate(nowBR.getDate() - 7)
    return { start: start.toISOString().split('T')[0], end: today }
  }
  if (periodType === 'biweek') {
    const start = new Date(nowBR)
    start.setDate(nowBR.getDate() - 15)
    return { start: start.toISOString().split('T')[0], end: today }
  }
  const start = new Date(nowBR.getFullYear(), nowBR.getMonth(), 1)
  return { start: start.toISOString().split('T')[0], end: today }
}

function shouldRun(schedule) {
  const now = new Date()
  const nowBR = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const [schedHour, schedMin] = schedule.send_time.split(':').map(Number)
  const nowHour = nowBR.getUTCHours()
  const nowMin = nowBR.getUTCMinutes()
  const nowDay = nowBR.getUTCDay()
  const nowDate = nowBR.getUTCDate()

  const schedTotalMin = schedHour * 60 + schedMin
  const nowTotalMin = nowHour * 60 + nowMin
  const diff = nowTotalMin - schedTotalMin
  if (diff < 0 || diff > 20) return false

  if (schedule.last_run) {
    const lastRun = new Date(schedule.last_run)
    const lastRunBR = new Date(lastRun.getTime() - 3 * 60 * 60 * 1000)
    const lastRunStr = lastRunBR.toISOString().split('T')[0]
    const todayStr = nowBR.toISOString().split('T')[0]
    if (lastRunStr === todayStr) return false
  }

  if (schedule.frequency === 'daily_morning' || schedule.frequency === 'daily_evening') return true
  if (schedule.frequency === 'weekly') return nowDay === (schedule.day_of_week ?? 5)
  if (schedule.frequency === 'biweekly') return nowDate === 15 || nowDate === (schedule.day_of_month ?? 30)
  if (schedule.frequency === 'monthly') return nowDate === (schedule.day_of_month ?? 1)
  return false
}

async function executeSchedule(schedule) {
  const { client_id, period_type, clients } = schedule
  const { start, end } = getPeriod(period_type)

  // Busca destinatários ativos
  const { data: recipients } = await supabase
    .from('recipients')
    .select('*')
    .eq('client_id', client_id)
    .eq('active', true)

  if (!recipients || recipients.length === 0) {
    return { status: 'skipped', reason: 'sem destinatários' }
  }

  // Usa o mesmo motor do reportsController — simula req/res
  const reportData = await new Promise((resolve, reject) => {
    const req = {
      body: {
        client_id,
        period_start: start,
        period_end: end,
      }
    }
    const res = {
      json: (data) => resolve(data),
      status: (code) => ({ json: (data) => reject(new Error(data.error || `HTTP ${code}`)) })
    }
    generateReport(req, res)
  })

  // Envia para cada destinatário
  const sendData = await new Promise((resolve, reject) => {
    const req = {
      body: {
        ...reportData,
        recipients,
      }
    }
    const res = {
      json: (data) => resolve(data),
      status: (code) => ({ json: (data) => reject(new Error(data.error || `HTTP ${code}`)) })
    }
    sendReport(req, res)
  })

  return {
    status: sendData.send_status,
    entradas: reportData.entradas,
    saidas: reportData.saidas,
    recipients: recipients.length,
  }
}

async function runCron(req, res) {
  const secret = req.headers['x-cron-secret']
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, clients(id, name, ca_connected, integration_type, omie_app_key)')
    .eq('active', true)

  console.log('CRON schedules found:', schedules?.length)

  const results = []

  for (const schedule of schedules || []) {
    if (!shouldRun(schedule)) {
      console.log(`CRON skip ${schedule.clients?.name}: shouldRun=false`)
      continue
    }

    const client = schedule.clients
    const clientOk = client?.ca_connected || (client?.integration_type === 'omie' && client?.omie_app_key)
    if (!clientOk) {
      console.log(`CRON skip ${client?.name}: cliente não conectado`)
      continue
    }

    try {
      console.log(`CRON running for ${client.name}...`)
      const result = await executeSchedule(schedule)
      await supabase.from('schedules').update({ last_run: new Date().toISOString() }).eq('id', schedule.id)
      results.push({ client: client.name, ...result })
      console.log(`CRON done for ${client.name}:`, result.status)
    } catch (err) {
      console.error(`CRON error for ${client?.name}:`, err.message)
      results.push({ client: client?.name, status: 'error', error: err.message })
    }
  }

  res.json({ ran: results.length, results })
}

async function runClient(req, res) {
  const { client_id } = req.body
  if (!client_id) return res.status(400).json({ error: 'client_id obrigatório' })

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, ca_connected, integration_type, omie_app_key')
    .eq('id', client_id)
    .single()

  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })

  const clientOk = client.ca_connected || (client.integration_type === 'omie' && client.omie_app_key)
  if (!clientOk) return res.status(400).json({ error: 'Cliente não conectado' })

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('client_id', client_id)
    .eq('active', true)

  if (!schedules || schedules.length === 0) {
    return res.status(400).json({ error: 'Nenhum agendamento ativo para este cliente' })
  }

  const schedule = { ...schedules[0], clients: client }

  try {
    const result = await executeSchedule(schedule)
    await supabase.from('schedules').update({ last_run: new Date().toISOString() }).eq('client_id', client_id)
    res.json({ message: `Relatório enviado para ${result.recipients} destinatário(s)`, ...result })
  } catch (err) {
    console.error('runClient error:', err.message)
    res.status(500).json({ error: err.message })
  }
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

module.exports = { runCron, runClient, list, create, update, remove }