import { NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  BookOpen, Network, Shield, User, LogOut,
  PenLine, ChevronRight, Sparkles, Folder, Plus, MoreVertical, Trash2, Star
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import api from '@/utils/api'
import { InputModal } from '@/components/ui/Common'
import toast from 'react-hot-toast'

function FolderList({ folders, setFolders }) {
  const [searchParams] = useSearchParams()
  const currentFolderId = searchParams.get('folder')

  const toggleFavorite = (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    api.patch(`/folders/${id}/toggle-favorite`).then(({ data }) => {
      setFolders(prev => prev.map(f => f.id === id ? data : f))
      toast.success(data.is_favorite ? 'Добавлено в избранное' : 'Удалено из избранного')
    })
  }

  const deleteFolder = (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Удалить папку? Все заметки останутся, но не будут привязаны к ней.')) {
      api.delete(`/folders/${id}`).then(() => {
        setFolders(prev => prev.filter(f => f.id !== id))
        toast.success('Папка удалена')
      })
    }
  }

  return (
    <div className="space-y-0.5">
      {folders.map(folder => (
        <NavLink
          key={folder.id}
          to={`/notes?folder=${folder.id}`}
          className={() => {
            const isActive = String(currentFolderId) === String(folder.id)
            return `sidebar-link group/folder ${isActive ? 'active' : ''}`
          }}
        >
          <Folder size={16} className="text-text-muted group-hover/folder:text-accent-purple-light transition-colors" />
          <span className="text-xs font-medium truncate flex-1">{folder.name}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover/folder:opacity-100 transition-all">
            <button 
                onClick={(e) => toggleFavorite(folder.id, e)}
                className={`p-1 hover:bg-star/10 rounded transition-all ${folder.is_favorite ? 'text-amber-400 opacity-100' : 'text-text-muted hover:text-amber-400'}`}
            >
                <Star size={12} fill={folder.is_favorite ? "currentColor" : "none"} />
            </button>
            <button 
                onClick={(e) => deleteFolder(folder.id, e)}
                className="p-1 hover:bg-red-500/10 hover:text-red-400 rounded transition-all"
            >
                <Trash2 size={12} />
            </button>
          </div>
        </NavLink>
      ))}
    </div>
  )
}

const navItems = [
  { to: '/notes', icon: BookOpen, label: 'Заметки' },
  { to: '/graph', icon: Network, label: 'Граф знаний' },
]

export default function Sidebar() {
  const { user, logout, isAdmin, canCreateNotes, isLoggedIn } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const folderId = searchParams.get('folder')

  const [folders, setFolders] = useState([])
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    api.get('/folders').then(({ data }) => setFolders(data)).catch(() => {})
  }, [])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setIsCreating(true)
    try {
      const { data } = await api.post('/folders', { name: newFolderName })
      setFolders(prev => [...prev, data])
      toast.success('Папка создана')
      setIsFolderModalOpen(false)
      setNewFolderName('')
    } catch {
      toast.error('Ошибка создания папки')
    } finally {
      setIsCreating(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Вы вышли из системы')
    navigate('/login')
  }

  const favoriteFolders = folders.filter(f => f.is_favorite)
  const regularFolders = folders.filter(f => !f.is_favorite)

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
            className={() => {
              const isNotes = to === '/notes'
              const isActive = isNotes 
                ? (pathname === '/notes' && !folderId)
                : pathname.startsWith(to)
              return `sidebar-link ${isActive ? 'active' : ''}`
            }}
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

        {/* Избранные курсы */}
        {favoriteFolders.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <div className="px-3 mb-2 flex items-center justify-between group">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">Избранные курсы</span>
            </div>
            <FolderList folders={favoriteFolders} setFolders={setFolders} />
          </div>
        )}

        {/* Папки */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="px-3 mb-2 flex items-center justify-between group">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/70">Все папки</span>
            {canCreateNotes() && (
              <button 
                onClick={() => setIsFolderModalOpen(true)}
                className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-accent-purple-light transition-colors"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <FolderList folders={regularFolders} setFolders={setFolders} />
          {folders.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-text-muted/50 italic">Нет папок</div>
          )}
        </div>
      </nav>

      <InputModal
        isOpen={isFolderModalOpen}
        title="Новая папка"
        placeholder="Название папки (курса)..."
        value={newFolderName}
        onChange={setNewFolderName}
        onConfirm={handleCreateFolder}
        onCancel={() => { setIsFolderModalOpen(false); setNewFolderName('') }}
        loading={isCreating}
      />

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
