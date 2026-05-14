import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const nav = [
  { to: '/', label: 'Dashboard', icon: '⊞', exact: true },
  { to: '/clients', label: 'Clientes', icon: '👥' },
  { to: '/history', label: 'Histórico', icon: '📋' },
  { to: '/settings', label: 'Configurações', icon: '⚙️' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">PH</span>
            </div>
            <span className="font-semibold text-slate-800">Consult Pro</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {user?.is_admin && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <span>👤</span>
              Usuários
            </NavLink>
          )}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.is_admin ? 'Administrador' : 'Colaborador'}</p>
          </div>
          <button onClick={handleLogout} className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
