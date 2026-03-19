import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { Sparkles, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Пароли не совпадают')
      return
    }
    setLoading(true)
    try {
      // Регистрация
      await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      })
      // Авто-логин
      const { data } = await api.post('/auth/login', { email: form.email, password: form.password })
      setAuth(data.user, data.access_token, data.refresh_token)
      toast.success('Добро пожаловать!')
      navigate('/notes')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-accent-purple-light" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Регистрация</h1>
          <p className="text-text-muted text-sm mt-1">Создайте аккаунт студента</p>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Полное имя</label>
              <input
                type="text"
                className="input"
                placeholder="Иванов Иван Иванович"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
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
                  placeholder="Минимум 8 символов"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
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
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Повторите пароль</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-text-muted text-sm">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-accent-purple-light hover:underline font-medium">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
