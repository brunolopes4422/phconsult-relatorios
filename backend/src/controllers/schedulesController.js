const supabase = require('../lib/supabase')
const { generate: generateReport, send: sendReport } = require('./reportsController')

function getPeriod(periodType, reportModel) {
  const now = new Date()
  const nowBR = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const today = nowBR.toISOString().split('T')[0]

  if (periodType === 'day') {
    if (reportModel === 'pagamentos_dia') {
      const yesterday = new Date(nowBR)
      yesterday.setDate(nowBR.getDate() - 1)
      const y = yesterday.toISOString().split('T')[0]
      return { start: y, end: y }
    }
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

async function processJob(job) {
  const { id, client_id, period_start, period_end } = job

  await supabase.from('job_queue')
    .update({ status: 'processing', attempts: job.attempts + 1 })
    .eq('id', id)

  const { data: recipients } = await supabase
    .from('recipients')
    .select('*')
    .eq('client_id', client_id)
    .eq('active', true)

  if (!recipients || recipients.length === 0) {
    await supabase.from('job_queue')
      .update({ status: 'skipped', error: 'sem destinatários', processed_at: new Date().toISOString() })
      .eq('id', id)
    return { status: 'skipped' }
  }

  const reportData = await new Promise((resolve, reject) => {
    const req = { body: { client_id, period_start, period_end } }
    const res = {
      json: resolve,
      status: (code) => ({ json: (data) => reject(new Error(data.error || `HTTP ${code}`)) })
    }
    generateReport(req, res)
  })

  const sendData = await new Promise((resolve, reject) => {
    const req = { body: { ...reportData, recipients } }
    const res = {
      json: resolve,
      status: (code) => ({ json: (data) => reject(new Error(data.error || `HTTP ${code}`)) })
    }
    sendReport(req, res)
  })

  await supabase.from('job_queue')
    .update({ status: 'sent', processed_at: new Date().toISOString() })
    .eq('id', id)

  return { status: sendData.send_status, recipients: recipients.length }
}

async function processQueue() {
  const { data: jobs } = await supabase
    .from('job_queue')
    .select('*')
    .in('status', ['pending', 'error'])
    .lt('attempts', 3)
    .order('created_at')

  if (!jobs || jobs.length === 0) return

  for (const job of jobs) {
    try {
      console.log(`QUEUE processing job ${job.id} for client ${job.client_id}...`)
      const result = await processJob(job)
      console.log(`QUEUE job ${job.id} done:`, result.status)

      if (job.schedule_id) {
        await supabase.from('schedules')
          .update({ last_run: new Date().toISOString() })
          .eq('id', job.schedule_id)
      }
    } catch (err) {
      console.error(`QUEUE job ${job.id} error:`, err.message)
      const newAttempts = job.attempts + 1
      const newStatus = newAttempts >= 3 ? 'failed' : 'error'
      await supabase.from('job_queue')
        .update({ status: newStatus, error: err.message, attempts: newAttempts })
        .eq('id', job.id)
    }
  }
}

async function runCron(req, res) {
  const secret = req.headers['x-cron-secret']
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, clients(id, name, ca_connected, integration_type, omie_app_key, report_model)')
    .eq('active', true)

  console.log('CRON schedules found:', schedules?.length)

  let queued = 0

  for (const schedule of schedules || []) {
    if (!shouldRun(schedule)) continue

    const client = schedule.clients
    const clientOk = client?.ca_connected || (client?.integration_type === 'omie' && client?.omie_app_key)
    if (!clientOk) {
      console.log(`CRON skip ${client?.name}: cliente não conectado`)
      continue
    }

    const { start, end } = getPeriod(schedule.period_type, client.report_model)

    await supabase.from('job_queue').insert({
      client_id: schedule.client_id,
      schedule_id: schedule.id,
      period_start: start,
      period_end: end,
      status: 'pending',
      attempts: 0,
    })

    await supabase.from('schedules')
      .update({ last_run: new Date().toISOString() })
      .eq('id', schedule.id)

    queued++
    console.log(`CRON queued job for ${client.name} (${start} → ${end})`)
  }

  res.json({ queued, message: 'Jobs enfileirados, processando em background' })

  processQueue().catch(err => console.error('QUEUE error:', err.message))
}

async function runClient(req, res) {
  const { client_id } = req.body
  if (!client_id) return res.status(400).json({ error: 'client_id obrigatório' })

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, ca_connected, integration_type, omie_app_key, report_model')
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

  const schedule = schedules[0]
  const { start, end } = getPeriod(schedule.period_type, client.report_model)

  const { data: job } = await supabase.from('job_queue').insert({
    client_id,
    schedule_id: schedule.id,
    period_start: start,
    period_end: end,
    status: 'pending',
    attempts: 0,
  }).select().single()

  res.json({ message: 'Job enfileirado, processando...', job_id: job.id })

  processQueue().catch(err => console.error('QUEUE error:', err.message))
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