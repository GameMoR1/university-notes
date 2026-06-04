import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import api from '@/utils/api'
import { PageLoader, CustomSelect } from '@/components/ui/Common'
import { BarChart, LineChart } from '@/components/ui/Charts'
import toast from 'react-hot-toast'
import {
  Users, BookOpen, MessageSquare, Tag, BarChart3, Shield,
  Search, ChevronDown, Check, Ban, UserCog, Trash2, Plus, X,
  Activity, Clock, Globe, Lock, RefreshCw, Settings, Save,
  Eye, EyeOff, Server, HardDrive, Wifi, Cpu, Database, Folder,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d) parts.push(d + 'д')
  if (h) parts.push(h + 'ч')
  if (m) parts.push(m + 'мин')
  return parts.join(' ') || '< 1мин'
}

function StatCard({ icon: Icon, label, value, color = 'purple', sub }) {
  const colors = {
    purple: 'from-accent-purple/20 to-accent-purple/5 border-accent-purple/30 text-accent-purple-light',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
  }
  return (
    <div className={`p-5 rounded-2xl border bg-gradient-to-br ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon size={20} />
        <span className="text-3xl font-bold text-text-primary">{value}</span>
      </div>
      <div className="text-sm font-medium text-text-primary">{label}</div>
      {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [usersPagination, setUsersPagination] = useState({ total: 0, pages: 1 })
  const [newRole, setNewRole] = useState({ name: '', description: '', can_create_notes: false, can_edit_notes: false, can_delete_notes: false, can_publish_notes: false, can_manage_users: false, can_comment: true })
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [siteSettings, setSiteSettings] = useState([])
  const [settingsDirty, setSettingsDirty] = useState({})
  const [settingsSaving, setSettingsSaving] = useState(false)

  const [health, setHealth] = useState(null)
  const [activity, setActivity] = useState([])

  const [logsPage, setLogsPage] = useState(1)
  const [logsData, setLogsData] = useState({ items: [], total: 0, pages: 1 })
  const [logsAction, setLogsAction] = useState('')
  const [logsSearch, setLogsSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const loadStats = async () => {
    try {
      const { data } = await api.get('/admin/stats')
      setStats(data)
    } catch {}
  }

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/admin/users', {
        params: { page: usersPage, per_page: 15, search: usersSearch || undefined },
      })
      setUsers(data.items)
      setUsersPagination({ total: data.total, pages: data.pages })
    } catch {}
  }

  const loadRoles = async () => {
    try {
      const { data } = await api.get('/roles')
      setRoles(data)
    } catch {}
  }

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/settings')
      setSiteSettings(data)
      const dirty = {}
      data.forEach(s => { dirty[s.key] = s.value })
      setSettingsDirty(dirty)
    } catch {}
  }

  const loadHealth = async () => {
    try {
      const { data } = await api.get('/admin/health')
      setHealth(data)
    } catch {}
  }

  const loadActivity = async () => {
    try {
      const { data } = await api.get('/admin/activity-history', { params: { days: 14 } })
      setActivity(data)
    } catch {}
  }

  const loadLogs = async () => {
    try {
      const params = { page: logsPage, per_page: 20 }
      if (logsAction) params.action = logsAction
      if (logsSearch) params.search = logsSearch
      const { data } = await api.get('/admin/logs', { params })
      setLogsData(data)
    } catch {}
  }

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadStats(), loadUsers(), loadRoles(), loadSettings(), loadHealth(), loadActivity(), loadLogs()])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (!loading) loadUsers() }, [usersPage, usersSearch])
  useEffect(() => { if (!loading) loadLogs() }, [logsPage, logsAction, logsSearch])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
    toast.success('Данные обновлены')
  }

  const toggleBlock = async (userId, isBlocked) => {
    try {
      await api.put(`/admin/users/${userId}`, { is_blocked: !isBlocked })
      toast.success(isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован')
      loadUsers()
    } catch {
      toast.error('Ошибка')
    }
  }

  const changeRole = async (userId, roleId) => {
    try {
      await api.put(`/admin/users/${userId}`, { role_id: roleId })
      toast.success('Роль изменена')
      loadUsers()
    } catch {
      toast.error('Ошибка')
    }
  }

  const deleteUser = async (userId) => {
    if (!confirm('Удалить пользователя?')) return
    try {
      await api.delete(`/admin/users/${userId}`)
      toast.success('Пользователь удалён')
      loadUsers()
    } catch {
      toast.error('Ошибка')
    }
  }

  const createRole = async () => {
    if (!newRole.name.trim()) return toast.error('Введите название роли')
    try {
      await api.post('/admin/roles', newRole)
      toast.success('Роль создана')
      setShowRoleForm(false)
      setNewRole({ name: '', description: '', can_create_notes: false, can_edit_notes: false, can_delete_notes: false, can_publish_notes: false, can_manage_users: false, can_comment: true })
      loadRoles()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка')
    }
  }

  const deleteRole = async (roleId) => {
    if (!confirm('Удалить роль?')) return
    try {
      await api.delete(`/admin/roles/${roleId}`)
      toast.success('Роль удалена')
      loadRoles()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Нельзя удалить')
    }
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      await api.put('/admin/settings/bulk', { settings: settingsDirty })
      toast.success('Настройки сохранены')
      loadSettings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения')
    } finally {
      setSettingsSaving(false)
    }
  }

  const SETTING_LABELS = {
    site_name: 'Название сайта',
    site_description: 'Описание сайта',
    allow_registration: 'Разрешить регистрацию',
    default_role: 'Роль по умолчанию',
    maintenance_mode: 'Режим обслуживания',
    max_notes_per_page: 'Заметок на странице',
    allow_comments: 'Разрешить комментарии',
    allow_guest_view: 'Гостевой просмотр',
    theme: 'Тема оформления',
  }

  const SETTING_DESCRIPTIONS = {
    site_name: 'Отображается в заголовке и на странице входа',
    site_description: 'Краткое описание системы',
    allow_registration: 'Разрешить новым пользователям регистрироваться самостоятельно',
    default_role: 'Роль, назначаемая новым пользователям',
    maintenance_mode: 'Включить режим обслуживания (только админы могут входить)',
    max_notes_per_page: 'Максимум заметок на одной странице списка',
    allow_comments: 'Разрешить добавление комментариев к заметкам',
    allow_guest_view: 'Разрешить просмотр опубликованных заметок без входа',
    theme: 'Тема оформления интерфейса',
  }

  const SETTING_TYPES = {
    site_name: 'text',
    site_description: 'textarea',
    allow_registration: 'boolean',
    default_role: 'select',
    maintenance_mode: 'boolean',
    max_notes_per_page: 'number',
    allow_comments: 'boolean',
    allow_guest_view: 'boolean',
    theme: 'select',
  }

  const CAT_COLORS = {
    auth: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    notes: 'bg-accent-purple/15 border-accent-purple/30 text-accent-purple-light',
    comments: 'bg-green-500/15 border-green-500/30 text-green-400',
    files: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    folders: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
    roles: 'bg-pink-500/15 border-pink-500/30 text-pink-400',
    users: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
    settings: 'bg-slate-500/15 border-slate-500/30 text-slate-400',
  }

  const ACTION_LABELS = {
    login: 'Вход', register: 'Регистрация', refresh: 'Обновление токена',
    create_note: 'Создание заметки', update_note: 'Редактирование заметки',
    delete_note: 'Удаление заметки', publish_note: 'Публикация',
    unpublish_note: 'Снятие с публикации',
    add_comment: 'Комментарий',
    upload_file: 'Загрузка файла', delete_file: 'Удаление файла',
    create_folder: 'Создание папки',
    admin_update_user: 'Изменение пользователя', admin_delete_user: 'Удаление пользователя',
    create_role: 'Создание роли', update_role: 'Изменение роли', delete_role: 'Удаление роли',
    update_setting: 'Изменение настройки', bulk_update_settings: 'Массовое изменение настроек',
  }

  if (loading) return <PageLoader />

  const TABS = [
    { id: 'stats', icon: BarChart3, label: 'Статистика' },
    { id: 'monitoring', icon: Activity, label: 'Мониторинг' },
    { id: 'users', icon: Users, label: 'Пользователи' },
    { id: 'roles', icon: UserCog, label: 'Роли' },
    { id: 'settings', icon: Settings, label: 'Настройки' },
    { id: 'logs', icon: Clock, label: 'Логи' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Хедер */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center">
            <Shield size={20} className="text-accent-purple-light" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Администрирование</h2>
            <p className="text-text-muted text-sm">Управление системой</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Обновить
        </button>
      </div>

      {/* Табы */}
      <div className="grid grid-cols-6 gap-1 mb-6 bg-bg-secondary p-1.5 rounded-xl border border-border">
        {TABS.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive ? 'text-white' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="admin-active-tab"
                    className="absolute inset-0 bg-accent-purple rounded-lg shadow-lg shadow-accent-purple/25"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </AnimatePresence>
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={13} /> {label}
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Статистика */}
        {activeTab === 'stats' && stats && (
          <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={Users} label="Пользователей" value={stats.total_users} color="purple" />
              <StatCard icon={BookOpen} label="Заметок" value={stats.total_notes} color="blue"
                sub={`${stats.published_notes} опубликовано`} />
              <StatCard icon={Eye} label="Просмотров" value={stats.total_views} color="blue" />
              <StatCard icon={MessageSquare} label="Комментариев" value={stats.total_comments} color="green" />
              <StatCard icon={Tag} label="Тегов" value={stats.total_tags} color="amber" />
              <StatCard icon={HardDrive} label="Файлов" value={stats.total_files} color="amber" />
              <StatCard icon={Folder} label="Папок" value={stats.total_folders} color="green" />
            </div>

            {/* Распределение по ролям */}
            <div className="card mb-6">
              <h3 className="font-semibold text-text-primary mb-4">Пользователи по ролям</h3>
              <div className="space-y-3">
                {Object.entries(stats.notes_by_role).map(([role, count]) => {
                  const total = stats.total_users || 1
                  const pct = Math.round((count / total) * 100)
                  const colors = { admin: '#ef4444', teacher: '#f59e0b', student: '#10b981' }
                  return (
                    <div key={role}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-text-secondary capitalize">{role}</span>
                        <span className="text-text-muted">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: colors[role] || '#7c3aed' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Мониторинг */}
        {activeTab === 'monitoring' && health && (
          <motion.div key="monitoring" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className={`p-5 rounded-2xl border bg-gradient-to-br ${health.status === 'ok' ? 'from-green-500/20 to-green-500/5 border-green-500/30' : 'from-red-500/20 to-red-500/5 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <Server size={20} className={health.status === 'ok' ? 'text-green-400' : 'text-red-400'} />
                  <span className={`text-sm font-bold ${health.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                    {health.status === 'ok' ? 'Всё в порядке' : 'Есть проблемы'}
                  </span>
                </div>
                <div className="text-sm text-text-muted">Общее состояние системы</div>
              </div>

              <div className={`p-5 rounded-2xl border bg-gradient-to-br ${health.database.status === 'ok' ? 'from-blue-500/20 to-blue-500/5 border-blue-500/30' : 'from-red-500/20 to-red-500/5 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <Database size={20} className={health.database.status === 'ok' ? 'text-blue-400' : 'text-red-400'} />
                  <span className={`text-sm font-bold ${health.database.status === 'ok' ? 'text-blue-400' : 'text-red-400'}`}>
                    {health.database.status === 'ok' ? 'Подключена' : 'Ошибка'}
                  </span>
                </div>
                <div className="text-sm text-text-muted">База данных ({health.database.type})</div>
                {health.database.error && <div className="text-xs text-red-400 mt-1">{health.database.error}</div>}
              </div>

              <div className={`p-5 rounded-2xl border bg-gradient-to-br ${health.storage.status === 'ok' ? 'from-amber-500/20 to-amber-500/5 border-amber-500/30' : 'from-red-500/20 to-red-500/5 border-red-500/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <HardDrive size={20} className={health.storage.status === 'ok' ? 'text-amber-400' : 'text-red-400'} />
                  <span className={`text-sm font-bold ${health.storage.status === 'ok' ? 'text-amber-400' : 'text-red-400'}`}>
                    {health.storage.status === 'ok' ? 'Доступно' : health.storage.status === 'degraded' ? 'Деградация' : 'Ошибка'}
                  </span>
                </div>
                <div className="text-sm text-text-muted">Файловое хранилище ({health.storage.type})</div>
                {health.storage.error && <div className="text-xs text-red-400 mt-1">{health.storage.error}</div>}
              </div>
            </div>

            {/* Системные метрики */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Cpu size={16} className="text-accent-purple-light" /> CPU
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Загрузка</span>
                      <span className="font-mono text-text-primary">{health.cpu.percent}%</span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-accent-purple transition-all" style={{ width: `${Math.min(health.cpu.percent, 100)}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-bg-tertiary rounded-lg p-2">
                      <div className="text-text-muted">Ядер</div>
                      <div className="text-text-primary font-mono">{health.cpu.count} физ. / {health.cpu.count_logical} лог.</div>
                    </div>
                    <div className="bg-bg-tertiary rounded-lg p-2">
                      <div className="text-text-muted">Частота</div>
                      <div className="text-text-primary font-mono">{Math.round(health.cpu.frequency_current)} / {Math.round(health.cpu.frequency_max)} МГц</div>
                    </div>
                    {health.cpu.load_1 !== null && (
                      <div className="bg-bg-tertiary rounded-lg p-2 col-span-2">
                        <div className="text-text-muted">Load Average</div>
                        <div className="text-text-primary font-mono">{health.cpu.load_1} / {health.cpu.load_5} / {health.cpu.load_15}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Database size={16} className="text-accent-purple-light" /> Память
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>RAM</span>
                      <span className="font-mono text-text-primary">{health.memory.percent}%</span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(health.memory.percent, 100)}%`, backgroundColor: health.memory.percent > 80 ? '#ef4444' : health.memory.percent > 50 ? '#f59e0b' : '#10b981' }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-text-muted mt-1">
                      <span>{formatBytes(health.memory.used)}</span>
                      <span>{formatBytes(health.memory.total)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Swap</span>
                      <span className="font-mono text-text-primary">{health.swap.percent}%</span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(health.swap.percent, 100)}%`, backgroundColor: health.swap.percent > 50 ? '#ef4444' : '#f59e0b' }} />
                    </div>
                    {health.swap.total > 0 && (
                      <div className="flex justify-between text-[10px] text-text-muted mt-1">
                        <span>{formatBytes(health.swap.used)}</span>
                        <span>{formatBytes(health.swap.total)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <HardDrive size={16} className="text-accent-purple-light" /> Диск
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Использование</span>
                      <span className="font-mono text-text-primary">{health.disk.percent}%</span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(health.disk.percent, 100)}%`, backgroundColor: health.disk.percent > 80 ? '#ef4444' : health.disk.percent > 50 ? '#f59e0b' : '#10b981' }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-text-muted mt-1">
                      <span>{formatBytes(health.disk.used)}</span>
                      <span>{formatBytes(health.disk.total)}</span>
                    </div>
                  </div>
                  {health.disk.read_bytes > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-bg-tertiary rounded-lg p-2">
                        <div className="text-text-muted">Чтение</div>
                        <div className="text-text-primary font-mono">{formatBytes(health.disk.read_bytes)}</div>
                      </div>
                      <div className="bg-bg-tertiary rounded-lg p-2">
                        <div className="text-text-muted">Запись</div>
                        <div className="text-text-primary font-mono">{formatBytes(health.disk.write_bytes)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Доп. метрики: сеть / процессы / аптайм */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Wifi size={16} className="text-accent-purple-light" /> Сеть
                </h3>
                {health.network.bytes_sent > 0 ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-bg-tertiary rounded-lg p-2">
                      <div className="text-text-muted">Отправлено</div>
                      <div className="text-text-primary font-mono">{formatBytes(health.network.bytes_sent)}</div>
                    </div>
                    <div className="bg-bg-tertiary rounded-lg p-2">
                      <div className="text-text-muted">Получено</div>
                      <div className="text-text-primary font-mono">{formatBytes(health.network.bytes_recv)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-text-muted py-4 text-center">Нет данных</div>
                )}
              </div>

              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-accent-purple-light" /> Процессы
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-text-primary font-mono">{health.processes.total}</span>
                  <span className="text-xs text-text-muted">активных процессов</span>
                </div>
                <div className="mt-3 text-xs text-text-muted">
                  Python {health.system.python_version}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Server size={16} className="text-accent-purple-light" /> Система
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Хост</span>
                    <span className="text-text-primary font-mono">{health.system.hostname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Аптайм</span>
                    <span className="text-text-primary font-mono">{formatUptime(health.system.uptime_seconds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Запуск</span>
                    <span className="text-text-primary font-mono text-[10px]">{new Date(health.system.boot_time).toLocaleString('ru-RU')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Графики активности */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 text-sm">Активность за 14 дней</h3>
                <div className="w-full">
                  {activity.length > 0 ? (
                    <BarChart
                      data={activity}
                      keys={['notes_created', 'comments', 'registrations']}
                      labels={['Заметки', 'Комментарии', 'Регистрации']}
                      height={200}
                    />
                  ) : (
                    <div className="text-sm text-text-muted py-8 text-center">Нет данных за последние 14 дней</div>
                  )}
                </div>
              </div>
              <div className="card">
                <h3 className="font-semibold text-text-primary mb-4 text-sm">Создание заметок</h3>
                <div className="w-full">
                {activity.length > 0 ? (
                  <LineChart
                    data={activity}
                    keys={['notes_created']}
                    labels={['Заметки']}
                    height={200}
                  />
                ) : (
                  <div className="text-sm text-text-muted py-8 text-center">Нет данных за последние 14 дней</div>
                )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Пользователи */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input pl-8 h-9 text-sm"
                  placeholder="Поиск пользователей..."
                  value={usersSearch}
                  onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1) }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl hover:border-border-light transition-all">
                  <div className="w-9 h-9 rounded-full bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent-purple-light text-sm font-bold">{user.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary text-sm">{user.name}</span>
                      {user.is_blocked && (
                        <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">Заблок.</span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted">{user.email}</div>
                  </div>

                  <CustomSelect
                    value={user.role?.id || ''}
                    onChange={(val) => changeRole(user.id, parseInt(val))}
                    options={roles.map((r) => ({ value: r.id, label: r.name }))}
                    className="w-32"
                  />

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleBlock(user.id, user.is_blocked)}
                      title={user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                      className={`p-1.5 rounded-lg border transition-all ${
                        user.is_blocked
                          ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      <Ban size={13} />
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="p-1.5 rounded-lg border border-red-500/20 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Пагинация */}
            {usersPagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: usersPagination.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setUsersPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm ${usersPage === p ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-muted border border-border hover:border-border-light'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Роли */}
        {activeTab === 'roles' && (
          <motion.div key="roles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-text-primary">Роли системы</h3>
              <button onClick={() => setShowRoleForm(!showRoleForm)} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={14} /> Новая роль
              </button>
            </div>

            <AnimatePresence>
              {showRoleForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card mb-4 overflow-hidden"
                >
                  <h4 className="font-medium text-text-primary mb-4">Создать роль</h4>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <input className="input text-sm h-9" placeholder="Название роли" value={newRole.name} onChange={(e) => setNewRole({...newRole, name: e.target.value})} />
                    <input className="input text-sm h-9" placeholder="Описание" value={newRole.description} onChange={(e) => setNewRole({...newRole, description: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {[
                      ['can_create_notes', 'Создание заметок'],
                      ['can_edit_notes', 'Редактирование'],
                      ['can_delete_notes', 'Удаление'],
                      ['can_publish_notes', 'Публикация'],
                      ['can_manage_users', 'Управление'],
                      ['can_comment', 'Комментарии'],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary">
                        <input
                          type="checkbox"
                          checked={newRole[key]}
                          onChange={(e) => setNewRole({...newRole, [key]: e.target.checked})}
                          className="accent-purple-500 w-4 h-4"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={createRole} className="btn-primary text-sm">Создать</button>
                    <button onClick={() => setShowRoleForm(false)} className="btn-secondary text-sm">Отмена</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-text-primary capitalize">{role.name}</h4>
                      {role.description && <p className="text-text-muted text-xs mt-0.5">{role.description}</p>}
                    </div>
                    {!['admin', 'teacher', 'student'].includes(role.name) && (
                      <button onClick={() => deleteRole(role.id)} className="p-1.5 text-red-400/50 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['can_create_notes', 'Создание'],
                      ['can_edit_notes', 'Редактирование'],
                      ['can_delete_notes', 'Удаление'],
                      ['can_publish_notes', 'Публикация'],
                      ['can_manage_users', 'Управление'],
                      ['can_comment', 'Комментарии'],
                    ].map(([key, label]) => (
                      <span
                        key={key}
                        className={`tag-chip text-xs ${
                          role[key]
                            ? 'bg-green-500/15 border-green-500/30 text-green-400'
                            : 'bg-bg-tertiary border-border text-text-muted line-through opacity-50'
                        }`}
                      >
                        {role[key] && <Check size={10} className="inline mr-0.5" />}
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Настройки */}
        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Settings size={16} className="text-accent-purple-light" /> Настройки сайта
              </h3>
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <Save size={14} />
                {settingsSaving ? 'Сохранение...' : 'Сохранить всё'}
              </button>
            </div>

            <div className="space-y-3">
              {siteSettings.map((setting) => {
                const key = setting.key
                const label = SETTING_LABELS[key] || key
                const desc = SETTING_DESCRIPTIONS[key] || ''
                const type = SETTING_TYPES[key] || 'text'
                const isBool = type === 'boolean'
                const value = settingsDirty[key] ?? setting.value

                return (
                  <div key={key} className="card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <label className="text-sm font-medium text-text-primary">{label}</label>
                        {desc && <p className="text-xs text-text-muted mt-0.5">{desc}</p>}
                      </div>

                      {isBool ? (
                        <button
                          onClick={() => setSettingsDirty(prev => ({ ...prev, [key]: value === 'true' ? 'false' : 'true' }))}
                          className={`relative w-12 h-7 rounded-full transition-all flex-shrink-0 ${value === 'true' ? 'bg-accent-purple' : 'bg-bg-tertiary border border-border'}`}
                        >
                          <motion.div
                            animate={{ x: value === 'true' ? 24 : 2 }}
                            className="w-5 h-5 bg-white rounded-full shadow-md absolute top-1 left-0.5"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                      ) : type === 'select' ? (
                        <CustomSelect
                          value={value}
                          onChange={(v) => setSettingsDirty(prev => ({ ...prev, [key]: v }))}
                          options={key === 'default_role'
                            ? [{ value: 'student', label: 'Студент' }, { value: 'teacher', label: 'Преподаватель' }]
                            : [{ value: 'dark', label: 'Тёмная' }]
                          }
                          className="w-44"
                        />
                      ) : type === 'textarea' ? (
                        <textarea
                          className="input w-80 text-sm py-2 resize-y min-h-[80px]"
                          value={value}
                          onChange={(e) => setSettingsDirty(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          type={type}
                          className="input w-44 text-sm h-9"
                          value={value}
                          onChange={(e) => setSettingsDirty(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Логи */}
        {activeTab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Clock size={16} className="text-accent-purple-light" /> Журнал активности
              </h3>
              <div className="flex items-center gap-2">
                <CustomSelect
                  value={logsAction}
                  onChange={(v) => { setLogsAction(v); setLogsPage(1) }}
                  groups={[
                    {
                      label: 'Все',
                      options: [{ value: '', label: 'Все действия' }],
                    },
                    {
                      label: 'Заметки',
                      options: [
                        { value: 'create_note', label: 'Создание' },
                        { value: 'update_note', label: 'Редактирование' },
                        { value: 'delete_note', label: 'Удаление' },
                        { value: 'publish_note', label: 'Публикация' },
                        { value: 'unpublish_note', label: 'Снятие с публикации' },
                      ],
                    },
                    {
                      label: 'Комментарии',
                      options: [{ value: 'add_comment', label: 'Добавление' }],
                    },
                    {
                      label: 'Файлы',
                      options: [
                        { value: 'upload_file', label: 'Загрузка' },
                        { value: 'delete_file', label: 'Удаление' },
                      ],
                    },
                    {
                      label: 'Папки',
                      options: [{ value: 'create_folder', label: 'Создание' }],
                    },
                    {
                      label: 'Пользователи',
                      options: [
                        { value: 'login', label: 'Вход' },
                        { value: 'register', label: 'Регистрация' },
                        { value: 'admin_update_user', label: 'Изменение' },
                        { value: 'admin_delete_user', label: 'Удаление' },
                      ],
                    },
                    {
                      label: 'Роли',
                      options: [
                        { value: 'create_role', label: 'Создание' },
                        { value: 'update_role', label: 'Изменение' },
                        { value: 'delete_role', label: 'Удаление' },
                      ],
                    },
                    {
                      label: 'Настройки',
                      options: [
                        { value: 'update_setting', label: 'Изменение' },
                        { value: 'bulk_update_settings', label: 'Массовое изменение' },
                      ],
                    },
                  ]}
                  placeholder="Все действия"
                  className="w-44"
                />
                <input
                  className="input text-xs h-9 w-48"
                  placeholder="Поиск по логам..."
                  value={logsSearch}
                  onChange={(e) => { setLogsSearch(e.target.value); setLogsPage(1) }}
                />
                <button
                  onClick={loadLogs}
                  className="btn-secondary p-2 h-9 w-9 flex items-center justify-center"
                  title="Обновить"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {logsData.items.map((log) => {
                const cat = log.category || 'other'
                const dotColor = CAT_COLORS[cat]?.split(' ')[2] || 'text-text-muted'
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="flex items-start gap-3 p-3 bg-bg-card border border-border rounded-xl hover:border-border-light transition-all cursor-pointer"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor.replace('text-', 'bg-')}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${CAT_COLORS[cat] || 'bg-bg-tertiary border-border text-text-muted'}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        {log.entity_type && (
                          <span className="text-xs text-text-muted font-mono">
                            [{log.entity_type}#{log.entity_id}]
                          </span>
                        )}
                        {log.details && (
                          <span className="text-xs text-text-muted italic truncate max-w-md">{log.details}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {log.user && (
                          <span className="text-xs text-text-muted font-medium">{log.user.name}</span>
                        )}
                        <span className="text-xs text-text-muted/60 flex items-center gap-1" title={new Date(log.created_at).toLocaleString('ru-RU')}>
                          <Clock size={10} />
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ru })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {logsData.items.length === 0 && (
                <div className="text-sm text-text-muted py-12 text-center flex flex-col items-center gap-2">
                  <Clock size={24} className="opacity-30" />
                  <span>Логов не найдено</span>
                </div>
              )}
            </div>

            {/* Пагинация логов */}
            {logsData.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                  disabled={logsPage <= 1}
                  className="p-2 rounded-lg bg-bg-tertiary border border-border text-text-muted hover:text-text-primary disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(logsData.pages, 10) }, (_, i) => {
                  const start = Math.max(1, logsPage - 5)
                  const p = start + i
                  if (p > logsData.pages) return null
                  return (
                    <button
                      key={p}
                      onClick={() => setLogsPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm ${logsPage === p ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-muted border border-border hover:border-border-light'}`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => setLogsPage(p => Math.min(logsData.pages, p + 1))}
                  disabled={logsPage >= logsData.pages}
                  className="p-2 rounded-lg bg-bg-tertiary border border-border text-text-muted hover:text-text-primary disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
            <div className="text-xs text-text-muted text-center mt-2">
              Всего записей: {logsData.total}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модалка деталей лога */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLog(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <span className={`text-xs font-medium px-2 py-1 rounded border ${CAT_COLORS[selectedLog.category] || 'bg-bg-tertiary border-border text-text-muted'}`}>
                  {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                </span>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {selectedLog.user && (
                  <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-purple-light text-xs font-bold">{selectedLog.user.name?.[0]}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{selectedLog.user.name}</div>
                      {selectedLog.user.email && (
                        <div className="text-xs text-text-muted">{selectedLog.user.email}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-bg-tertiary rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60 mb-1">Категория</div>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${CAT_COLORS[selectedLog.category] || 'bg-bg-tertiary border-border text-text-muted'}`}>
                      {selectedLog.category || 'other'}
                    </span>
                  </div>
                  <div className="p-3 bg-bg-tertiary rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60 mb-1">Действие</div>
                    <div className="text-xs text-text-primary font-mono break-all">{selectedLog.action}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-bg-tertiary rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60 mb-1">Время</div>
                    <div className="text-xs text-text-primary">{new Date(selectedLog.created_at).toLocaleString('ru-RU')}</div>
                  </div>
                  {selectedLog.entity_type && (
                    <div className="p-3 bg-bg-tertiary rounded-xl">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60 mb-1">Сущность</div>
                      <div className="text-xs text-text-primary font-mono">{selectedLog.entity_type}#{selectedLog.entity_id}</div>
                    </div>
                  )}
                </div>

                {selectedLog.details && (
                  <div className="p-3 bg-bg-tertiary rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60 mb-1">Детали</div>
                    <div className="text-xs text-text-secondary whitespace-pre-wrap break-words">{selectedLog.details}</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
