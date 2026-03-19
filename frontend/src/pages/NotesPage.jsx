import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { PageLoader, EmptyState, Badge, FolderSwitcher } from '@/components/ui/Common'
import { Search, Plus, BookOpen, Eye, MessageSquare, Tag, Filter, X, Clock, User, Globe, Lock, ChevronDown, FolderPlus, Star, Folder } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import toast from 'react-hot-toast'

function NoteCard({ note, onDelete, onMove }) {
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
        <div className="flex-shrink-0 mt-0.5 flex items-center gap-2">
          {canCreateNotes() && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(note) }}
              className="p-1 px-1.5 hover:bg-bg-tertiary rounded text-text-muted hover:text-accent-purple-light transition-all flex items-center gap-1"
              title="Переместить в папку"
            >
              <FolderPlus size={14} />
            </button>
          )}
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

function MoveToFolderModal({ isOpen, onClose, note, folders, onConfirm }) {
  const [selectedFolderId, setSelectedFolderId] = useState(note?.folder_id || '')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await api.patch(`/notes/${note.id}`, { folder_id: selectedFolderId === '' ? null : parseInt(selectedFolderId) })
      toast.success('Заметка перемещена')
      onConfirm()
      onClose()
    } catch {
      toast.error('Ошибка при перемещении')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-text-primary font-semibold text-lg mb-2">Переместить в папку</h3>
        <p className="text-text-secondary text-sm mb-6 truncate italic">"{note?.title}"</p>
        
        <div className="space-y-1 max-h-60 overflow-y-auto thin-scroll mb-6 pr-1">
          <button
            onClick={() => setSelectedFolderId('')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${selectedFolderId === '' ? 'bg-accent-purple/20 text-accent-purple-light border border-accent-purple/30' : 'hover:bg-bg-tertiary text-text-primary border border-transparent'}`}
          >
            Без папки
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFolderId(f.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between ${selectedFolderId === f.id ? 'bg-accent-purple/20 text-accent-purple-light border border-accent-purple/30' : 'hover:bg-bg-tertiary text-text-primary border border-transparent'}`}
            >
              <span>{f.name}</span>
              {f.is_favorite && <Star size={10} fill="currentColor" className="text-amber-400" />}
            </button>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Отмена</button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="btn-primary text-sm px-6 flex items-center gap-2"
          >
            {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Готово
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const folderId = searchParams.get('folder')

  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedAuthor, setSelectedAuthor] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [tags, setTags] = useState([])
  const [authors, setAuthors] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [showOnlyMy, setShowOnlyMy] = useState(false)
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false)

  const { user, canCreateNotes } = useAuthStore()
  const navigate = useNavigate()

  const [folders, setFolders] = useState([])
  const [movingNote, setMovingNote] = useState(null)

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        per_page: 18,
        published_only: false,
        sort_by: sortBy,
        ...(search && { search }),
        ...(selectedTag && { tag: selectedTag }),
        ...(selectedAuthor && { author_id: selectedAuthor }),
        ...(folderId && { folder_id: folderId }),
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
  }, [page, search, selectedTag, selectedAuthor, sortBy, folderId, showOnlyMy, user?.id])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  useEffect(() => {
    api.get('/tags').then(({ data }) => setTags(data)).catch(() => { })
    api.get('/folders').then(({ data }) => setFolders(data)).catch(() => { })
    api.get('/users').then(({ data }) => {
        // Упростим: берем только тех, кто может создавать заметки (учителя/админы)
        setAuthors(data.items.filter(u => u.role?.can_create_notes))
    }).catch(() => { })
  }, [])

  // Сброс страницы при фильтрации
  useEffect(() => {
    setPage(1)
  }, [search, selectedTag, selectedAuthor, sortBy, folderId, showOnlyMy])

  const [folderName, setFolderName] = useState('')

  useEffect(() => {
    if (folderId) {
        api.get('/folders').then(({ data }) => {
            const f = data.find(folder => folder.id === parseInt(folderId))
            if (f) setFolderName(f.name)
        })
    } else {
        setFolderName('')
    }
  }, [folderId])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Хедер */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">
            Учебные заметки
          </h2>
          <p className="text-text-muted text-sm mt-1 flex items-center gap-2">
            <BookOpen size={14} /> {pagination.total} {pagination.total === 1 ? 'заметка' : 'заметок'}
          </p>
        </div>
        {canCreateNotes() && (
          <button onClick={() => navigate('/notes/new')} className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl shadow-lg shadow-accent-purple/20">
            <Plus size={18} /> Создать
          </button>
        )}
      </div>

      <FolderSwitcher 
        folders={folders} 
        selectedId={folderId} 
        labelAll="Все заметки"
        onSelect={(id) => setSearchParams(prev => {
          if (id) prev.set('folder', id)
          else prev.delete('folder')
          return prev
        })} 
      />

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

        {/* Фильтр по тегу */}
        <div className="relative">
          <button
            onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
            className="input h-10 w-40 flex items-center justify-between text-sm bg-bg-primary"
          >
            <span className={selectedTag ? "text-text-primary" : "text-text-muted"}>
              {selectedTag || "Все теги"}
            </span>
            <ChevronDown size={14} className="text-text-muted transition-transform" style={{ transform: tagDropdownOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          <AnimatePresence>
            {tagDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full mt-2 bg-bg-secondary border border-border rounded-xl shadow-xl overflow-hidden z-20 w-56"
              >
                <div className="max-h-60 overflow-y-auto thin-scroll py-1.5 flex flex-col">
                  <button
                    onClick={() => { setSelectedTag(''); setTagDropdownOpen(false) }}
                    className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-bg-tertiary ${!selectedTag ? 'text-accent-purple-light bg-accent-purple/10' : 'text-text-primary'}`}
                  >
                    Все теги
                  </button>
                  {tags.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTag(t.name); setTagDropdownOpen(false) }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-bg-tertiary flex items-center gap-2.5 ${selectedTag === t.name ? 'text-accent-purple-light bg-accent-purple/10' : 'text-text-primary'}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }}></div>
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Фильтр по автору */}
        <div className="relative">
          <button
            onClick={() => setAuthorDropdownOpen(!authorDropdownOpen)}
            className="input h-10 w-40 flex items-center justify-between text-sm bg-bg-primary"
          >
            <span className={selectedAuthor ? "text-text-primary" : "text-text-muted"}>
              {authors.find(a => a.id === selectedAuthor)?.name || "Все авторы"}
            </span>
            <ChevronDown size={14} className="text-text-muted transition-transform" style={{ transform: authorDropdownOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          <AnimatePresence>
            {authorDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 top-full mt-2 bg-bg-secondary border border-border rounded-xl shadow-xl overflow-hidden z-20 w-56"
              >
                <div className="max-h-60 overflow-y-auto thin-scroll py-1.5 flex flex-col">
                  <button
                    onClick={() => { setSelectedAuthor(''); setAuthorDropdownOpen(false) }}
                    className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-bg-tertiary ${!selectedAuthor ? 'text-accent-purple-light bg-accent-purple/10' : 'text-text-primary'}`}
                  >
                    Все авторы
                  </button>
                  {authors.map(a => (
                    <button
                      key={a.id}
                      onClick={() => { setSelectedAuthor(a.id); setAuthorDropdownOpen(false) }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-bg-tertiary flex items-center gap-2.5 ${selectedAuthor === a.id ? 'text-accent-purple-light bg-accent-purple/10' : 'text-text-primary'}`}
                    >
                      <User size={14} className="text-text-muted" />
                      <span className="truncate">{a.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Сортировка */}
        <div className="relative">
          <button
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="input h-10 w-44 flex items-center justify-between text-sm bg-bg-primary"
          >
            <span className="text-text-primary flex items-center gap-2">
              <Clock size={14} className="text-text-muted" />
              {sortBy === 'newest' ? 'Сначала новые' : sortBy === 'oldest' ? 'Сначала старые' : 'По алфавиту'}
            </span>
            <ChevronDown size={14} className="text-text-muted" style={{ transform: sortDropdownOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          <AnimatePresence>
            {sortDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-2 bg-bg-secondary border border-border rounded-xl shadow-xl overflow-hidden z-20 w-48"
              >
                <div className="py-1.5 flex flex-col">
                  {[
                    { val: 'newest', label: 'Сначала новые' },
                    { val: 'oldest', label: 'Сначала старые' },
                    { val: 'alphabetical', label: 'По алфавиту' }
                  ].map(s => (
                    <button
                      key={s.val}
                      onClick={() => { setSortBy(s.val); setSortDropdownOpen(false) }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-bg-tertiary ${sortBy === s.val ? 'text-accent-purple-light bg-accent-purple/10' : 'text-text-primary'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Слой для закрытия */}
        {(tagDropdownOpen || sortDropdownOpen || authorDropdownOpen) && (
          <div className="fixed inset-0 z-10" onClick={() => {
            setTagDropdownOpen(false)
            setSortDropdownOpen(false)
            setAuthorDropdownOpen(false)
          }} />
        )}

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
              <NoteCard key={note.id} note={note} onMove={(n) => setMovingNote(n)} />
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

      <MoveToFolderModal
        isOpen={!!movingNote}
        onClose={() => setMovingNote(null)}
        note={movingNote}
        folders={folders}
        onConfirm={fetchNotes}
      />
    </div>
  )
}
