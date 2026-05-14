import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../lib/auth'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('processing')
  const navigate = useNavigate()

  useEffect(() => {
    const code = params.get('code')
    const state = params.get('state')

    if (!code || !state) {
      setStatus('error')
      return
    }

    api.get(`/auth/callback?code=${code}&state=${state}`)
      .then(() => {
        setStatus('success')
        setTimeout(() => {
          if (window.opener) {
            window.opener.location.reload()
            window.close()
          } else {
            navigate('/clients')
          }
        }, 1500)
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-xl font-bold">PH</span>
        </div>
        {status === 'processing' && (
          <>
            <h2 className="text-xl font-semibold text-slate-800">Conectando...</h2>
            <p className="text-slate-500 mt-2">Processando autenticação da Conta Azul</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-semibold text-slate-800">Conectado!</h2>
            <p className="text-slate-500 mt-2">Conta Azul conectada com sucesso!</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-3">❌</div>
            <h2 className="text-xl font-semibold text-slate-800">Erro na conexão</h2>
            <p className="text-slate-500 mt-2">Não foi possível conectar ao Conta Azul. Tente novamente.</p>
            <button className="btn-secondary mt-4 w-full" onClick={() => navigate('/clients')}>Voltar</button>
          </>
        )}
      </div>
    </div>
  )
}