import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import api from '@/utils/api'
import toast from 'react-hot-toast'
import { User, Mail, Shield, Save, Key, Eye, EyeOff, BookOpen, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' })
  const [pwdForm, setPwdForm] = useState({ current: '', new_: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [myNotes, setMyNotes] = useState([])

  useEffect(() => {
    api.get('/notes', { params: { author_id: user?.id, per_page: 5, published_only: false } })
      .then(({ data }) => setMyNotes(data.items || []))
      .catch(() => {})
  }, [user?.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.put('/users/me', form)
      updateUser(data)
      toast.success('Профиль обновлён')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const getRoleColor = (roleName) => {
    const colors = {
      admin: 'bg-red-500/20 text-red-400 border-red-500/30',
      teacher: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      student: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    }
    return colors[roleName] || 'bg-bg-tertiary text-text-muted border-border'
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-accent-purple/20 border-2 border-accent-purple/40 flex items-center justify-center">
          <span className="text-accent-purple-light text-2xl font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">{user?.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`tag-chip text-xs ${getRoleColor(user?.role?.name)}`}>
              <Shield size={10} className="inline mr-1" />
              {user?.role?.name}
            </span>
            <span className="text-xs text-text-muted">{user?.email}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Данные профиля */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <User size={16} className="text-accent-purple-light" /> Данные профиля
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Полное имя</label>
              <input
                className="input text-sm h-9"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Email</label>
              <input
                type="email"
                className="input text-sm h-9"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2 w-full justify-center">
              <Save size={14} /> {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </motion.div>

        {/* Права доступа */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Shield size={16} className="text-accent-purple-light" /> Права доступа
          </h3>
          <div className="space-y-2">
            {[
              ['can_create_notes', 'Создание заметок'],
              ['can_edit_notes', 'Редактирование'],
              ['can_delete_notes', 'Удаление'],
              ['can_publish_notes', 'Публикация'],
              ['can_manage_users', 'Управление системой'],
              ['can_comment', 'Комментарии'],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{label}</span>
                <span className={`text-xs font-medium ${user?.role?.[key] ? 'text-green-400' : 'text-text-muted'}`}>
                  {user?.role?.[key] ? '✓ Разрешено' : '✗ Запрещено'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Мои последние заметки */}
        {myNotes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card md:col-span-2">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-accent-purple-light" /> Мои заметки (последние)
            </h3>
            <div className="space-y-2">
              {myNotes.map((note) => (
                <div key={note.id} className="flex items-center justify-between p-2.5 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${note.is_published ? 'bg-green-400' : 'bg-text-muted'}`} />
                    <span className="text-sm text-text-primary">{note.title}</span>
                  </div>
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <Clock size={11} />
                    {format(new Date(note.updated_at), 'dd.MM.yy', { locale: ru })}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Информация о регистрации */}
      <div className="mt-6 p-4 bg-bg-secondary border border-border rounded-xl">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Дата регистрации:</span>
          <span className="text-text-secondary">
            {user?.created_at
              ? format(new Date(user.created_at), 'dd MMMM yyyy', { locale: ru })
              : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
