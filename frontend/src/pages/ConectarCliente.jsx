import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'

export default function ConectarCliente() {
  const { clientId } = useParams()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/public/clients/${clientId}`)
      .then(({ data }) => setClient(data))
      .catch(() => setError('Link inválido ou expirado.'))
      .finally(() => setLoading(false))
  }, [clientId])

  async function conectar() {
    const { data } = await api.get(`/clients/${clientId}/ca-auth-url`)
    window.location.href = data.url
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logos */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <img src="/logo-ph.png" alt="PH Consult Pro" className="h-16 w-16 rounded-xl object-contain bg-black p-1" />
          <div className="flex flex-col items-center">
            <div className="w-px h-8 bg-slate-600" />
            <span className="text-slate-500 text-xs mt-1">×</span>
          </div>
          <div className="bg-blue-500 rounded-xl p-3 flex items-center justify-center">
            <span className="text-white font-bold text-xl tracking-tight">Conta Azul</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header dourado */}
          <div className="bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400 p-6 text-center">
            <p className="text-amber-100 text-sm font-medium uppercase tracking-widest mb-1">Solicitação de acesso</p>
            <h1 className="text-white text-2xl font-bold">PH Consult Pro</h1>
          </div>

          <div className="p-8">
            {error ? (
              <div className="text-center">
                <div className="text-5xl mb-4">❌</div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Link inválido</h2>
                <p className="text-slate-500">{error}</p>
              </div>
            ) : client?.ca_connected ? (
              <div className="text-center">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Acesso já autorizado!</h2>
                <p className="text-slate-500">A conta <strong>{client.name}</strong> já está integrada com sucesso.</p>
                <p className="text-slate-400 text-sm mt-2">Obrigado pela confiança!</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <p className="text-slate-600 mb-4">
                    A <strong>PH Consult Pro</strong> solicita autorização para acessar os dados financeiros da empresa:
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <p className="text-amber-800 font-bold text-xl">{client?.name}</p>
                  </div>
                </div>

                {/* O que será acessado */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">O que será acessado:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="text-emerald-500">✓</span> Contas a receber
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="text-emerald-500">✓</span> Contas a pagar
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="text-emerald-500">✓</span> Dados cadastrais da empresa
                    </div>
                  </div>
                </div>

                <button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
                  onClick={conectar}
                >
                  <span>🔗</span> Autorizar via Conta Azul
                </button>

                <p className="text-center text-xs text-slate-400 mt-4">
                  Você será redirecionado para o Conta Azul para confirmar o acesso de forma segura. Nenhuma senha é compartilhada com a PH Consult Pro.
                </p>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © 2026 PH Consult Pro · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}