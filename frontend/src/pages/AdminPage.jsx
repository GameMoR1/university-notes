import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import api from '@/utils/api'
import { PageLoader } from '@/components/ui/Common'
import toast from 'react-hot-toast'
import {
  Users, BookOpen, MessageSquare, Tag, BarChart3, Shield,
  Search, ChevronDown, Check, Ban, UserCog, Trash2, Plus, X,
  Activity, Clock, Globe, Lock, RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { motion as m, AnimatePresence } from 'framer-motion'

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

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadStats(), loadUsers(), loadRoles()])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (!loading) loadUsers() }, [usersPage, usersSearch])

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

  if (loading) return <PageLoader />

  const TABS = [
    { id: 'stats', icon: BarChart3, label: 'Статистика' },
    { id: 'users', icon: Users, label: 'Пользователи' },
    { id: 'roles', icon: UserCog, label: 'Роли' },
    { id: 'logs', icon: Activity, label: 'Логи' },
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
      <div className="flex gap-2 mb-6 bg-bg-secondary p-1.5 rounded-xl border border-border w-fit">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-accent-purple text-white shadow-lg shadow-accent-purple/25'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Статистика */}
      {activeTab === 'stats' && stats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Users} label="Пользователей" value={stats.total_users} color="purple" />
            <StatCard icon={BookOpen} label="Заметок" value={stats.total_notes} color="blue"
              sub={`${stats.published_notes} опубликовано`} />
            <StatCard icon={MessageSquare} label="Комментариев" value={stats.total_comments} color="green" />
            <StatCard icon={Tag} label="Тегов" value={stats.total_tags} color="amber" />
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

      {/* Пользователи */}
      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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

                <select
                  value={user.role?.id || ''}
                  onChange={(e) => changeRole(user.id, parseInt(e.target.value))}
                  className="input h-8 text-xs w-32"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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

      {/* Логи */}
      {activeTab === 'logs' && stats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Activity size={16} className="text-accent-purple-light" /> Журнал активности (последние 20)
          </h3>
          <div className="space-y-2">
            {stats.recent_logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-bg-card border border-border rounded-xl">
                <div className="w-2 h-2 rounded-full bg-accent-purple mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text-primary font-mono">{log.action}</span>
                    {log.entity_type && (
                      <span className="text-xs text-text-muted">
                        [{log.entity_type}#{log.entity_id}]
                      </span>
                    )}
                    {log.details && (
                      <span className="text-xs text-text-muted italic truncate max-w-xs">{log.details}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {log.user && (
                      <span className="text-xs text-text-muted">{log.user.name}</span>
                    )}
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ru })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
