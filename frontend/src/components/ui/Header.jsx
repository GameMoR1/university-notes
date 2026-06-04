import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, ArrowLeft, Sun, Moon } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

const TITLES = {
  '/notes': 'Заметки',
  '/graph': 'Граф знаний',
  '/admin': 'Администрирование',
  '/profile': 'Профиль',
}

export default function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const location = useLocation()
  const navigate = useNavigate()

  const title = Object.entries(TITLES).find(([key]) =>
    location.pathname.startsWith(key)
  )?.[1] || 'УСУЗ'

  const canGoBack = location.pathname !== '/notes' && location.pathname !== '/graph'

  return (
    <header className="h-14 border-b border-border bg-bg-secondary/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all"
      >
        <Menu size={18} />
      </button>

      {canGoBack && (
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all"
        >
          <ArrowLeft size={18} />
        </button>
      )}

      <h1 className="text-sm font-semibold text-text-primary">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all"
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="text-xs text-text-muted bg-bg-tertiary border border-border px-2.5 py-1 rounded-full">
          v1.0
        </div>
      </div>
    </header>
  )
}
