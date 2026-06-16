const axios = require('axios')

const OMIE_BASE = 'https://app.omie.com.br/api/v1'

function formatDateBR(dateStr) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchExtrato(appKey, appSecret, periodStart, periodEnd, contaId) {
  try {
    const { data } = await axios.post(`${OMIE_BASE}/financas/extrato/`, {
      call: 'ListarExtrato',
      app_key: appKey,
      app_secret: appSecret,
      param: [{
        nCodCC: contaId,
        dPeriodoInicial: formatDateBR(periodStart),
        dPeriodoFinal: formatDateBR(periodEnd),
      }]
    })
    return data
  } catch (err) {
    if (err.code === 'ECONNRESET' || err.response?.data?.faultcode?.includes('REDUNDANT')) {
      await sleep(5000)
      return fetchExtrato(appKey, appSecret, periodStart, periodEnd, contaId)
    }
    throw err
  }
}

async function fetchOmieFinanceiro(appKey, appSecret, periodStart, periodEnd, accountIds) {
  if (!accountIds || accountIds.length === 0) {
    return { entradas: 0, saidas: 0, saldo: 0, saldoAnterior: 0, saldoAtual: 0, receber_count: 0, pagar_count: 0, pagamentos: [], recebimentos: [] }
  }

  let totalEntradas = 0
  let totalSaidas = 0
  let totalSaldoAnterior = 0
  let receber_count = 0
  let pagar_count = 0
  let pagamentos = []
  let recebimentos = []

  for (const contaId of accountIds) {
    await sleep(2000)

    const data = await fetchExtrato(appKey, appSecret, periodStart, periodEnd, Number(contaId))

    totalSaldoAnterior += data?.nSaldoAnterior || 0

    const movimentos = data?.listaMovimentos || []

    for (const m of movimentos) {
      const situacao = m.cSituacao || ''
      if (situacao === 'Previsto' || situacao === 'Vence hoje' || !m.cNatureza) continue

      const origem = m.cOrigem || ''
      if (origem.includes('Transferência')) continue

      const valor = Math.abs(m.nValorDocumento || 0)
      const natureza = m.cNatureza || ''

      if (natureza === 'R') {
        totalEntradas += valor
        receber_count++
        recebimentos.push({
          nome: m.cDesCliente || 'Sem descrição',
          valor,
        })
      } else if (natureza === 'P') {
        totalSaidas += valor
        pagar_count++
        pagamentos.push({
          nome: m.cDesCliente || 'Sem descrição',
          valor,
        })
      }
    }
  }

  const saldoAtual = totalSaldoAnterior + (totalEntradas - totalSaidas)

  return {
    entradas: totalEntradas,
    saidas: totalSaidas,
    saldo: totalEntradas - totalSaidas,
    saldoAnterior: totalSaldoAnterior,
    saldoAtual,
    receber_count,
    pagar_count,
    pagamentos,
    recebimentos,
  }
}

module.exports = { fetchOmieFinanceiro }