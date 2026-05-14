import { useEffect, useState } from 'react'
import api from '../lib/api'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(v || 0)
}

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/reports/history').then(({ data }) => setHistory(data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Histórico de envios</h1>
        <p className="text-slate-500">Todos os relatórios gerados e enviados</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Período</th>
                <th className="px-6 py-3">Entradas</th>
                <th className="px-6 py-3">Saídas</th>
                <th className="px-6 py-3">Saldo</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Enviado em</th>
                <th className="px-6 py-3">Msg</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{h.clients?.name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                    {h.period_start} → {h.period_end}
                  </td>
                  <td className="px-6 py-4 text-sm text-emerald-600">R$ {fmt(h.entradas)}</td>
                  <td className="px-6 py-4 text-sm text-red-500">R$ {fmt(h.saidas)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">R$ {fmt(h.saldo)}</td>
                  <td className="px-6 py-4">
                    {h.send_status === 'sent' ? <span className="badge-green">● Enviado</span>
                      : h.send_status === 'partial' ? <span className="badge-yellow">● Parcial</span>
                      : <span className="badge-red">● Pendente</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {h.sent_at ? new Date(h.sent_at).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-brand-600 hover:underline text-sm" onClick={() => setSelected(h)}>Ver</button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Nenhum envio realizado</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Message modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Mensagem enviada</h2>
            <pre className="text-sm text-slate-700 bg-slate-50 rounded-lg p-4 whitespace-pre-wrap font-sans">{selected.message}</pre>
            <button className="btn-secondary mt-4 w-full" onClick={() => setSelected(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}
