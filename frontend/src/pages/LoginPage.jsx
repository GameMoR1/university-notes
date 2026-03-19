import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Sparkles, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      setAuth(data.user, data.access_token, data.refresh_token)
      toast.success(`Добро пожаловать, ${data.user.name}!`)
      navigate('/notes')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Фоновые эффекты */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Логотип */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center mb-4 animate-glow">
            <Sparkles className="w-8 h-8 text-accent-purple-light" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Добро пожаловать</h1>
          <p className="text-text-muted text-sm mt-1">Университетская система заметок</p>
        </div>

        {/* Форма */}
        <div className="bg-bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                className="input"
                placeholder="student@university.ru"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Пароль</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-text-muted text-sm">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-accent-purple-light hover:underline font-medium">
                Зарегистрироваться
              </Link>
            </p>
          </div>

          {/* Тестовые данные (пользователи создаются на бэкенде при TEST=true) */}
          <div className="mt-4 p-3 bg-bg-tertiary rounded-xl border border-border">
            <p className="text-text-muted text-xs font-medium mb-2">Демо-входы (если на сервере TEST=true):</p>
            <div className="space-y-1">
              {[
                { email: 'admin@university.ru', pwd: 'Admin1234!', role: 'Администратор' },
                { email: 'teacher@university.ru', pwd: 'Teacher123!', role: 'Преподаватель' },
                { email: 'student@university.ru', pwd: 'Student123!', role: 'Студент' },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => setForm({ email: acc.email, password: acc.pwd })}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-bg-hover text-xs text-text-muted hover:text-text-secondary transition-all"
                >
                  <span className="text-accent-purple-light">{acc.role}</span>: {acc.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
