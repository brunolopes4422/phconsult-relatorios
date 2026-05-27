const supabase = require('../lib/supabase')
const axios = require('axios')
const { getValidToken } = require('./clientsController')
const { fetchOmieFinanceiro } = require('./omieController')
const { getSelectedAccountIds } = require('./accountsController')

const CA_BASE = 'https://api-v2.contaazul.com'
const ZAP_BASE = process.env.ZAP_BASE_URL
const ZAP_KEY = process.env.ZAP_API_KEY

function zapHeaders() {
  return { Authorization: `Bearer ${ZAP_KEY}` }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(value || 0)
}

function serializeParams(p) {
  const parts = []
  for (const [key, val] of Object.entries(p)) {
    if (Array.isArray(val)) {
      val.forEach(v => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`))
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    }
  }
  return parts.join('&')
}

function buildMessageOmie(recipientName, startDate, endDate, entradas, saidas, resultado, saldoAnterior, saldoAtual) {
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
  return `Olá, ${recipientName}!

Fechamento financeiro de ${fmt(startDate)} até ${fmt(endDate)}:

📈 Entradas no período: R$ ${formatCurrency(entradas)}
📉 Saídas no período: R$ ${formatCurrency(saidas)}
📊 Resultado do período: R$ ${formatCurrency(resultado)}

💰 Saldo em conta (${fmt(endDate)}): R$ ${formatCurrency(saldoAtual)}
(Saldo anterior R$ ${formatCurrency(saldoAnterior)} + resultado do período)

Atenciosamente,
Equipe PH Consult Pro`
}

function buildMessagePagamentosDia(recipientName, date, saidas, pagamentos) {
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')

  const lista = pagamentos.length > 0
    ? pagamentos
        .sort((a, b) => b.valor - a.valor)
        .map((p, i) => `${i + 1}. ${p.nome} - R$ ${formatCurrency(p.valor)}`)
        .join('\n')
    : 'Nenhum pagamento realizado'

  return `Olá, ${recipientName}!

💸 Pagamentos realizados em ${fmt(date)}:

${lista}

💰 Total pago: R$ ${formatCurrency(saidas)}

Atenciosamente,
Equipe PH Consult Pro`
}

function buildMessageCA(recipientName, startDate, endDate, entradas, saidas, topReceitas, topDespesas) {
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')

  const listaReceitas = topReceitas.length > 0
    ? topReceitas.map((r, i) => `${i + 1}. ${r.nome} - R$ ${formatCurrency(r.valor)}`).join('\n')
    : 'Nenhuma receita no período'

  const listaDespesas = topDespesas.length > 0
    ? topDespesas.map((r, i) => `${i + 1}. ${r.nome} - R$ ${formatCurrency(r.valor)}`).join('\n')
    : 'Nenhuma despesa no período'

  return `Olá, ${recipientName}!

Fechamento financeiro de ${fmt(startDate)} até ${fmt(endDate)}:

📈 Receitas realizadas: R$ ${formatCurrency(entradas)}
📉 Despesas realizadas: R$ ${formatCurrency(saidas)}

🏆 Top 5 Receitas:
${listaReceitas}

💸 Top 5 Despesas:
${listaDespesas}

Atenciosamente,
Equipe PH Consult Pro`
}

async function fetchAllPages(url, token, params) {
  let page = 1
  let all = []
  while (true) {
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: { ...params, pagina: page, tamanho_pagina: 100 },
      paramsSerializer: serializeParams
    })
    const items = data?.itens || data?.content || data || []
    if (!Array.isArray(items) || items.length === 0) break
    all = all.concat(items)
    if (items.length < 100) break
    page++
  }
  return all
}

async function getCABalance(token, accountIds) {
  if (!accountIds || accountIds.length === 0) return 0
  let total = 0
  for (const id of accountIds) {
    try {
      const { data } = await axios.get(`${CA_BASE}/v1/conta-financeira/${id}/saldo-atual`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      total += data?.saldo_atual || 0
    } catch (err) {
      console.error(`Erro saldo conta ${id}:`, err.message)
    }
  }
  return total
}

async function fetchCAReceberPagar(token, period_start, period_end, selectedAccounts) {
  let receber = []
  let pagar = []

  const baseParams = {
    data_vencimento_de: '2000-01-01',
    data_vencimento_ate: '2099-12-31',
    data_pagamento_de: period_start,
    data_pagamento_ate: period_end,
  }

  if (selectedAccounts.length > 0) {
    for (const accId of selectedAccounts) {
      const params = { ...baseParams, ids_contas_financeiras: accId }
      const r = await fetchAllPages(`${CA_BASE}/v1/financeiro/eventos-financeiros/contas-a-receber/buscar`, token, { ...params, 'status[]': ['RECEBIDO'] })
      await new Promise(resolve => setTimeout(resolve, 500))
      const p = await fetchAllPages(`${CA_BASE}/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar`, token, { ...params, 'status[]': ['PAGO'] })
      await new Promise(resolve => setTimeout(resolve, 500))
      receber = receber.concat(r)
      pagar = pagar.concat(p)
    }
  } else {
    const r = await fetchAllPages(`${CA_BASE}/v1/financeiro/eventos-financeiros/contas-a-receber/buscar`, token, { ...baseParams, 'status[]': ['RECEBIDO'] })
    await new Promise(resolve => setTimeout(resolve, 500))
    const p = await fetchAllPages(`${CA_BASE}/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar`, token, { ...baseParams, 'status[]': ['PAGO'] })
    receber = r
    pagar = p
  }

  return { receber, pagar }
}

async function generate(req, res) {
  const { client_id, period_start, period_end } = req.body
  if (!client_id || !period_start || !period_end) {
    return res.status(400).json({ error: 'Campos obrigatórios: client_id, period_start, period_end' })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, ca_connected, integration_type, omie_app_key, omie_app_secret, report_model')
    .eq('id', client_id)
    .single()

  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })

  try {
    let entradas = 0, saidas = 0, saldoAnterior = 0, saldoAtual = 0, raw = {}
    let message = ''
    const selectedAccounts = await getSelectedAccountIds(client_id)

    if (client.integration_type === 'omie') {
      if (!client.omie_app_key || !client.omie_app_secret) {
        return res.status(400).json({ error: 'Chaves Omie não configuradas' })
      }
      const result = await fetchOmieFinanceiro(
        client.omie_app_key,
        client.omie_app_secret,
        period_start,
        period_end,
        selectedAccounts
      )
      entradas = result.entradas
      saidas = result.saidas
      saldoAnterior = result.saldoAnterior || 0
      saldoAtual = result.saldoAtual || (saldoAnterior + (entradas - saidas))
      raw = { receber_count: result.receber_count, pagar_count: result.pagar_count }

      if (client.report_model === 'pagamentos_dia') {
        message = buildMessagePagamentosDia(client.name, period_end, saidas, result.pagamentos || [])
      } else {
        message = buildMessageOmie(client.name, period_start, period_end, entradas, saidas, entradas - saidas, saldoAnterior, saldoAtual)
      }

    } else {
      if (!client.ca_connected) return res.status(400).json({ error: 'Cliente não conectado ao Conta Azul' })
      const token = await getValidToken(client_id)

      const { receber, pagar } = await fetchCAReceberPagar(token, period_start, period_end, selectedAccounts)

      const transParams = { data_inicio: period_start, data_fim: period_end }
      if (selectedAccounts.length > 0) transParams.ids_conta_financeira = selectedAccounts
      const transferencias = await fetchAllPages(`${CA_BASE}/v1/financeiro/transferencias`, token, transParams)

      let transEntradasValor = 0
      let transSaidasValor = 0
      const transEntradas = []
      const transSaidas = []

      for (const t of transferencias) {
        const valor = t.valor || 0
        const origemId = t.origem?.conta_financeira?.id
        const destinoId = t.destino?.conta_financeira?.id
        const isSelectedOrigem = selectedAccounts.length === 0 || selectedAccounts.includes(origemId)
        const isSelectedDestino = selectedAccounts.length === 0 || selectedAccounts.includes(destinoId)

        if (isSelectedOrigem && !isSelectedDestino) {
          transSaidasValor += valor
          transSaidas.push({
            nome: t.descricao || (t.origem?.conta_financeira?.nome + ' → ' + t.destino?.conta_financeira?.nome) || 'Transferência',
            valor
          })
        } else if (isSelectedDestino && !isSelectedOrigem) {
          transEntradasValor += valor
          transEntradas.push({
            nome: t.descricao || (t.origem?.conta_financeira?.nome + ' → ' + t.destino?.conta_financeira?.nome) || 'Transferência',
            valor
          })
        }
      }

      entradas = receber.reduce((sum, i) => sum + (i.pago || i.total || 0), 0) + transEntradasValor
      saidas = pagar.reduce((sum, i) => sum + (i.pago || i.total || 0), 0) + transSaidasValor

      const todasReceitas = [
        ...receber.map(i => ({
          nome: i.descricao && i.cliente?.nome ? `${i.descricao} - ${i.cliente.nome}` : i.descricao || i.cliente?.nome || 'Sem descrição',
          valor: i.pago || 0
        })),
        ...transEntradas,
      ].sort((a, b) => b.valor - a.valor).slice(0, 5)

      const todasDespesas = [
        ...pagar.map(i => ({
          nome: i.descricao && i.fornecedor?.nome ? `${i.descricao} - ${i.fornecedor.nome}` : i.descricao || i.fornecedor?.nome || 'Sem descrição',
          valor: i.pago || i.total || 0
        })),
        ...transSaidas,
      ].sort((a, b) => b.valor - a.valor).slice(0, 5)

      raw = { receber_count: receber.length + transEntradas.length, pagar_count: pagar.length + transSaidas.length }
      message = buildMessageCA(client.name, period_start, period_end, entradas, saidas, todasReceitas, todasDespesas)
    }

    res.json({
      client_id,
      client_name: client.name,
      period_start,
      period_end,
      entradas,
      saidas,
      saldo: entradas - saidas,
      saldoAnterior,
      saldoAtual,
      message,
      raw,
    })
  } catch (err) {
    console.error('Report generate error:', err.response?.data || err.message)
    res.status(500).json({ error: err.message })
  }
}

async function send(req, res) {
  const { client_id, period_start, period_end, entradas, saidas, saldo, saldoAnterior, saldoAtual, message, recipients } = req.body

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
    const personalizedMessage = message.replace(/^Olá, .+!/m, `Olá, ${r.name}!`)
    try {
      await axios.post(
        `${ZAP_BASE}/api/send/${r.phone}`,
        { body: personalizedMessage, connectionFrom },
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