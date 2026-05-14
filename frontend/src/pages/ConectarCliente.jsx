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
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center">
      <p className="text-white">Carregando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-xl font-bold">PH</span>
        </div>

        {error ? (
          <>
            <div className="text-4xl mb-3">❌</div>
            <h2 className="text-xl font-semibold text-slate-800">Link inválido</h2>
            <p className="text-slate-500 mt-2">{error}</p>
          </>
        ) : client?.ca_connected ? (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-semibold text-slate-800">Já conectado!</h2>
            <p className="text-slate-500 mt-2">A conta <strong>{client.name}</strong> já está integrada. Obrigado!</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Autorizar acesso</h2>
            <p className="text-slate-500 mb-4">
              A <strong>PH Consult Pro</strong> precisa de acesso aos dados financeiros da empresa:
            </p>
            <div className="bg-brand-50 rounded-lg p-4 mb-6">
              <p className="font-semibold text-brand-700 text-lg">{client?.name}</p>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Ao clicar em autorizar, você será redirecionado para o Conta Azul para confirmar o acesso. Seus dados estão seguros.
            </p>
            <button className="btn-primary w-full py-3 text-base" onClick={conectar}>
              🔗 Autorizar acesso ao Conta Azul
            </button>
          </>
        )}
      </div>
    </div>
  )
}