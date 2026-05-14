import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Dashboard() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/clients').then(({ data }) => setClients(data)).finally(() => setLoading(false))
  }, [])

  const connected = clients.filter(c => c.ca_connected).length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Gerencie e envie relatórios financeiros</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Total de clientes</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{clients.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Conta Azul conectada</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{connected}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Sem conexão</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{clients.length - connected}</p>
        </div>
      </div>

      {/* Clients list */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Clientes</h2>
          <button className="btn-primary text-sm" onClick={() => navigate('/clients')}>Gerenciar</button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 mb-4">Nenhum cliente cadastrado</p>
            <button className="btn-primary" onClick={() => navigate('/clients')}>Cadastrar cliente</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Conta Azul</th>
                <th className="px-6 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{c.name}</td>
                  <td className="px-6 py-4">
                    <span className={c.status === 'active' ? 'badge-green' : 'badge-red'}>
                      {c.status === 'active' ? '● Ativo' : '● Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {c.ca_connected ? (
                      <span className="badge-green">● Conectado</span>
                    ) : (
                      <span className="badge-yellow">● Desconectado</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="btn-primary text-sm"
                      disabled={c.integration_type === 'omie' ? !c.omie_app_key : !c.ca_connected}
                      onClick={() => navigate(`/report/${c.id}`)}
                      title={c.integration_type === 'omie' ? (!c.omie_app_key ? 'Configure as chaves Omie primeiro' : '') : (!c.ca_connected ? 'Conecte o Conta Azul primeiro' : '')}
                    >
                      📊 Gerar relatório
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
