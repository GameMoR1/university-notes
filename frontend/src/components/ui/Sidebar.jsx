import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  BookOpen, Network, Shield, User, LogOut,
  PenLine, ChevronRight, Sparkles
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/notes', icon: BookOpen, label: 'Заметки' },
  { to: '/graph', icon: Network, label: 'Граф знаний' },
]

export default function Sidebar() {
  const { user, logout, isAdmin, canCreateNotes } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Вы вышли из системы')
    navigate('/login')
  }

  return (
    <aside className="w-64 h-full bg-bg-secondary border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent-purple-light" />
          </div>
          <div>
            <div className="font-bold text-text-primary text-sm leading-tight">УСУЗ</div>
            <div className="text-text-muted text-xs">Система заметок</div>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <nav className="flex-1 p-3 space-y-1 overflow-auto thin-scroll">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/notes'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
            <span className="text-sm font-medium">{label}</span>
          </NavLink>
        ))}

        {canCreateNotes() && (
          <NavLink
            to="/notes/new"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <PenLine size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium">Создать заметку</span>
          </NavLink>
        )}

        {isAdmin() && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Shield size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium">Администрирование</span>
          </NavLink>
        )}
      </nav>

      {/* Профиль */}
      <div className="p-3 border-t border-border">
        {user ? (
          <>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${isActive ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary'
                }`
              }
            >
              <div className="w-8 h-8 rounded-full bg-accent-purple/30 border border-accent-purple/50 flex items-center justify-center flex-shrink-0">
                <span className="text-accent-purple-light text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">{user?.name || 'Пользователь'}</div>
                <div className="text-xs text-text-muted truncate">{user?.role?.name}</div>
              </div>
              <ChevronRight size={14} className="text-text-muted" />
            </NavLink>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 mt-1"
            >
              <LogOut size={16} />
              <span className="text-sm">Выйти</span>
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            className="btn-primary flex items-center justify-center w-full py-2 rounded-lg text-sm"
          >
            Войти в систему
          </NavLink>
        )}
      </div>
    </aside>
  )
}
