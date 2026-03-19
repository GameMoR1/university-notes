import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { PageLoader, EmptyState, Badge } from '@/components/ui/Common'
import { Search, Plus, BookOpen, Eye, MessageSquare, Tag, Filter, X, Clock, User, Globe, Lock, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import toast from 'react-hot-toast'

function NoteCard({ note, onDelete }) {
  const navigate = useNavigate()
  const { canCreateNotes, isAdmin } = useAuthStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="card cursor-pointer group hover:border-accent-purple/40 hover:shadow-lg hover:shadow-accent-purple/5"
      onClick={() => navigate(`/notes/${note.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-text-primary text-sm leading-snug group-hover:text-accent-purple-light transition-colors line-clamp-2">
          {note.title}
        </h3>
        <div className="flex-shrink-0 mt-0.5">
          {note.is_published ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Globe size={12} /> <span className="hidden sm:inline">Опублик.</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Lock size={12} /> <span className="hidden sm:inline">Черновик</span>
            </span>
          )}
        </div>
      </div>

      {/* Теги */}
      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {note.tags.slice(0, 4).map((tag) => (
            <span
              key={tag.id}
              className="tag-chip text-xs"
              style={{
                backgroundColor: tag.color + '25',
                borderColor: tag.color + '60',
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="tag-chip text-xs bg-bg-tertiary border-border text-text-muted">+{note.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-text-muted mt-auto pt-3 border-t border-border/50">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <User size={11} /> {note.author?.name?.split(' ')[0]}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={11} /> {note.views_count}
          </span>
          <span className="flex items-center gap-1" title="Комментарии">
            <MessageSquare size={11} /> {note.comments_count ?? 0}
          </span>
        </div>
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: ru })}
        </span>
      </div>
    </motion.div>
  )
}

export default function NotesPage() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [tags, setTags] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [showOnlyMy, setShowOnlyMy] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const { user, canCreateNotes } = useAuthStore()
  const navigate = useNavigate()

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        per_page: 18,
        published_only: false,
        ...(search && { search }),
        ...(selectedTag && { tag: selectedTag }),
        ...(showOnlyMy && { author_id: user?.id }),
      }
      const { data } = await api.get('/notes', { params })
      setNotes(data.items)
      setPagination({ total: data.total, pages: data.pages })
    } catch {
      toast.error('Не удалось загрузить заметки')
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedTag, showOnlyMy, user?.id])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  useEffect(() => {
    api.get('/tags').then(({ data }) => setTags(data)).catch(() => { })
  }, [])

  // Сброс страницы при фильтрации
  useEffect(() => {
    setPage(1)
  }, [search, selectedTag, showOnlyMy])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Хедер */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Учебные заметки</h2>
          <p className="text-text-muted text-sm mt-0.5">
            {pagination.total} {pagination.total === 1 ? 'заметка' : 'заметок'}
          </p>
        </div>
        {canCreateNotes() && (
          <button onClick={() => navigate('/notes/new')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Создать
          </button>
        )}
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Поиск */}
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            className="input pl-9 h-10"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Фильтр по тегу с кастомным Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="input h-10 w-48 flex items-center justify-between text-sm bg-bg-primary"
          >
            <span className={selectedTag ? "text-text-primary" : "text-text-muted"}>
              {selectedTag || "Все теги"}
            </span>
            <ChevronDown size={14} className="text-text-muted transition-transform" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-2 bg-bg-secondary border border-border rounded-xl shadow-xl overflow-hidden z-20"
              >
                <div className="max-h-60 overflow-y-auto thin-scroll py-1.5 flex flex-col">
                  <button
                    onClick={() => { setSelectedTag(''); setDropdownOpen(false) }}
                    className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-bg-tertiary ${!selectedTag ? 'text-accent-purple-light bg-accent-purple/10' : 'text-text-primary'
                      }`}
                  >
                    Все теги
                  </button>
                  {tags.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTag(t.name); setDropdownOpen(false) }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-bg-tertiary flex items-center gap-2.5 ${selectedTag === t.name ? 'text-accent-purple-light bg-accent-purple/10' : 'text-text-primary'
                        }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }}></div>
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Слой поверх страницы для закрытия при клике вне */}
          {dropdownOpen && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setDropdownOpen(false)}
            />
          )}
        </div>

        {/* Мои заметки */}
        {canCreateNotes() && (
          <button
            onClick={() => setShowOnlyMy(!showOnlyMy)}
            className={`flex items-center gap-2 px-4 h-10 rounded-lg border text-sm transition-all ${showOnlyMy
                ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple-light'
                : 'bg-bg-tertiary border-border text-text-muted hover:border-border-light'
              }`}
          >
            <Filter size={14} />
            Мои
          </button>
        )}
      </div>

      {/* Теги */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedTag('')}
            className={`tag-chip text-xs transition-all ${!selectedTag
                ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple-light'
                : 'bg-bg-tertiary border-border text-text-muted hover:border-border-light'
              }`}
          >
            Все
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(selectedTag === tag.name ? '' : tag.name)}
              className="tag-chip text-xs transition-all"
              style={
                selectedTag === tag.name
                  ? { backgroundColor: tag.color + '30', borderColor: tag.color + '80', color: tag.color }
                  : { backgroundColor: tag.color + '15', borderColor: tag.color + '40', color: tag.color + 'cc' }
              }
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Контент */}
      {loading ? (
        <PageLoader />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Заметок не найдено"
          description={search ? `Нет результатов для "${search}"` : "Здесь пока нет заметок"}
          action={
            canCreateNotes() ? (
              <button onClick={() => navigate('/notes/new')} className="btn-primary">
                Создать первую заметку
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>

          {/* Пагинация */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                ←
              </button>
              {Array.from({ length: Math.min(7, pagination.pages) }, (_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${page === p
                        ? 'bg-accent-purple text-white'
                        : 'bg-bg-tertiary text-text-muted hover:text-text-primary border border-border'
                      }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
