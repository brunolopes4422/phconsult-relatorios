import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(v || 0)
}

export default function Report() {
  const { clientId } = useParams()
  const navigate = useNavigate()

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 8) + '01'

  const [period, setPeriod] = useState({ start: firstOfMonth, end: today })
  const [report, setReport] = useState(null)
  const [message, setMessage] = useState('')
  const [recipients, setRecipients] = useState([])
  const [selected, setSelected] = useState([])
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [client, setClient] = useState(null)

  useEffect(() => {
    api.get(`/clients/${clientId}`).then(({ data }) => setClient(data))
    api.get(`/clients/${clientId}/recipients`).then(({ data }) => {
      setRecipients(data.filter(r => r.active))
      setSelected(data.filter(r => r.active).map(r => r.id))
    })
  }, [clientId])

  async function generate() {
    setGenerating(true)
    setReport(null)
    setSendResult(null)
    try {
      const { data } = await api.post('/reports/generate', {
        client_id: clientId,
        period_start: period.start,
        period_end: period.end,
      })
      setReport(data)
      setMessage(data.message)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao gerar relatório')
    } finally {
      setGenerating(false)
    }
  }

  async function send() {
    if (selected.length === 0) return alert('Selecione ao menos um destinatário')
    setSending(true)
    setSendResult(null)
    try {
      const recipientObjects = recipients.filter(r => selected.includes(r.id))
      const { data } = await api.post('/reports/send', {
        ...report,
        message,
        recipients: recipientObjects,
      })
      setSendResult(data)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  function toggleRecipient(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-2">
        <button className="text-sm text-brand-600 hover:underline" onClick={() => navigate('/')}>← Voltar</button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Gerar Relatório</h1>
        <p className="text-slate-500">{client?.name}</p>
      </div>

      {/* Period selector */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Período</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Data inicial</label>
            <input className="input" type="date" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Data final</label>
            <input className="input" type="date" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={generate} disabled={generating}>
            {generating ? '⏳ Buscando...' : '🔍 Buscar dados'}
          </button>
        </div>
      </div>

      {/* Report preview */}
      {report && (
        <>
          {/* Cards */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="card p-5 border-l-4 border-emerald-500">
              <p className="text-sm text-slate-500">📈 Entradas no período</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">R$ {fmt(report.entradas)}</p>
              <p className="text-xs text-slate-400 mt-1">{report.raw?.receber_count} registros</p>
            </div>
            <div className="card p-5 border-l-4 border-red-400">
              <p className="text-sm text-slate-500">📉 Saídas no período</p>
              <p className="text-2xl font-bold text-red-500 mt-1">R$ {fmt(report.saidas)}</p>
              <p className="text-xs text-slate-400 mt-1">{report.raw?.pagar_count} registros</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card p-5 border-l-4 border-slate-400">
              <p className="text-sm text-slate-500">📊 Resultado do período</p>
              <p className={`text-2xl font-bold mt-1 ${report.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                R$ {fmt(report.saldo)}
              </p>
            </div>
            <div className="card p-5 border-l-4 border-brand-500">
              <p className="text-sm text-slate-500">💰 Saldo em conta</p>
              <p className={`text-2xl font-bold mt-1 ${(report.saldoAtual || 0) >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
                R$ {fmt(report.saldoAtual)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Anterior R$ {fmt(report.saldoAnterior)} + resultado
              </p>
            </div>
          </div>

          {/* Message editor */}
          <div className="card p-6 mb-6">
            <h2 className="font-semibold text-slate-800 mb-4">Mensagem (editável)</h2>
            <textarea
              className="input font-mono text-sm"
              rows={14}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          {/* Recipients */}
          <div className="card p-6 mb-6">
            <h2 className="font-semibold text-slate-800 mb-4">Destinatários</h2>
            {recipients.length === 0 ? (
              <p className="text-slate-400 text-sm">Nenhum destinatário ativo. <button className="text-brand-600 hover:underline" onClick={() => navigate(`/clients/${clientId}`)}>Cadastrar</button></p>
            ) : (
              <div className="space-y-2">
                {recipients.map(r => (
                  <label key={r.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-brand-500"
                      checked={selected.includes(r.id)}
                      onChange={() => toggleRecipient(r.id)}
                    />
                    <div>
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-sm text-slate-500">{r.phone}{r.role && ` · ${r.role}`}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Send */}
          {sendResult ? (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-800 mb-4">Resultado do envio</h2>
              <div className="space-y-2">
                {sendResult.results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <span>{r.status === 'sent' ? '✅' : '❌'}</span>
                    <div>
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-sm text-slate-500">{r.phone}</p>
                    </div>
                    <span className={`ml-auto text-sm font-medium ${r.status === 'sent' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {r.status === 'sent' ? 'Enviado' : 'Falhou'}
                    </span>
                  </div>
                ))}
              </div>
              <button className="btn-secondary mt-4 w-full" onClick={() => navigate('/history')}>Ver histórico</button>
            </div>
          ) : (
            <button
              className="btn-primary w-full py-3 text-base"
              onClick={send}
              disabled={sending || selected.length === 0}
            >
              {sending ? '📤 Enviando...' : `📤 Enviar via WhatsApp (${selected.length} destinatário${selected.length !== 1 ? 's' : ''})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}