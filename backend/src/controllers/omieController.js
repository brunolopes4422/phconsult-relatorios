const axios = require('axios')

const OMIE_BASE = 'https://app.omie.com.br/api/v1'

function formatDateBR(dateStr) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

async function fetchMovimentos(appKey, appSecret, periodStart, periodEnd, natureza, accountIds) {
  let page = 1
  let all = []

  while (true) {
    const param = {
      nPagina: page,
      nRegPorPagina: 500,
      dDtPagtoDe: formatDateBR(periodStart),
      dDtPagtoAte: formatDateBR(periodEnd),
      cNatureza: natureza,
      cStatus: 'LIQUIDADO',
    }

    const { data } = await axios.post(`${OMIE_BASE}/financas/mf/`, {
      call: 'ListarMovimentos',
      app_key: appKey,
      app_secret: appSecret,
      param: [param]
    })

    let movimentos = data?.movimentos || []
    if (!Array.isArray(movimentos) || movimentos.length === 0) break

    if (accountIds && accountIds.length > 0) {
      movimentos = movimentos.filter(m =>
        accountIds.includes(String(m.detalhes?.nCodCC))
      )
    }

    all = all.concat(movimentos)
    if ((data?.movimentos || []).length < 500) break
    page++
  }

  return all
}

async function fetchOmieFinanceiro(appKey, appSecret, periodStart, periodEnd, accountIds) {
  const receber = await fetchMovimentos(appKey, appSecret, periodStart, periodEnd, 'R', accountIds)
  
  // Aguarda 3 segundos antes da próxima chamada
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  const pagar = await fetchMovimentos(appKey, appSecret, periodStart, periodEnd, 'P', accountIds)

  const entradas = receber.reduce((sum, i) => sum + (i.resumo?.nValPago || 0), 0)
  const saidas = pagar.reduce((sum, i) => sum + (i.resumo?.nValPago || 0), 0)

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    receber_count: receber.length,
    pagar_count: pagar.length,
  }
}

module.exports = { fetchOmieFinanceiro }