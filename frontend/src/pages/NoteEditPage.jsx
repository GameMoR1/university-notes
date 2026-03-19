import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '@/utils/api'
import { PageLoader } from '@/components/ui/Common'
import toast from 'react-hot-toast'
import {
  Save, Eye, EyeOff, ArrowLeft, Tag, Link2, X, Plus,
  Globe, Lock, Loader2
} from 'lucide-react'

export default function NoteEditPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [content, setContent] = useState('')

  const [form, setForm] = useState({
    title: '',
    is_published: false,
    tag_ids: [],
    linked_note_ids: [],
  })

  const [tags, setTags] = useState([])
  const [allNotes, setAllNotes] = useState([])
  const [newTag, setNewTag] = useState('')
  const [linkSearch, setLinkSearch] = useState('')

  const editorRef = useRef(null)
  const editorViewRef = useRef(null)

  // Инициализация CodeMirror
  useEffect(() => {
    if (!editorRef.current || preview) return

    const view = new EditorView({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setContent(update.state.doc.toString())
          }
        }),
        EditorView.theme({
          '&': { background: '#141416', height: '100%', minHeight: '400px' },
          '.cm-content': { padding: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-focused': { outline: 'none' },
        }),
      ],
      parent: editorRef.current,
    })

    editorViewRef.current = view
    return () => {
      view.destroy()
      editorViewRef.current = null
    }
  }, [preview])

  // Синхронизируем содержимое при переключении режимов
  useEffect(() => {
    if (!preview && editorViewRef.current) {
      const currentDoc = editorViewRef.current.state.doc.toString()
      if (currentDoc !== content) {
        editorViewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: content },
        })
      }
    }
  }, [preview, content])

  // Загрузка данных
  useEffect(() => {
    const load = async () => {
      try {
        const [tagsRes, notesRes] = await Promise.all([
          api.get('/tags'),
          api.get('/notes', { params: { per_page: 100, published_only: false } }),
        ])
        setTags(tagsRes.data)
        setAllNotes(notesRes.data.items.filter((n) => String(n.id) !== String(id)))

        if (isEdit) {
          const { data } = await api.get(`/notes/${id}`)
          setForm({
            title: data.title,
            is_published: data.is_published,
            tag_ids: (data.tags || []).map((t) => Number(t.id)),
            linked_note_ids: (data.linked_notes || []).map((n) => Number(n.id)),
          })
          setContent(data.content || '')
        }
      } catch {
        toast.error('Ошибка загрузки данных')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit])

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Введите название заметки')
      return
    }
    setSaving(true)
    try {
      const tag_ids = (form.tag_ids || []).map((x) => Number(x)).filter((x) => !Number.isNaN(x))
      const linked_note_ids = (form.linked_note_ids || [])
        .map((x) => Number(x))
        .filter((x) => !Number.isNaN(x))
      const payload = { ...form, content, tag_ids, linked_note_ids }
      if (isEdit) {
        await api.put(`/notes/${id}`, payload)
        toast.success('Заметка сохранена')
        navigate(`/notes/${id}`)
      } else {
        const { data } = await api.post('/notes', payload)
        toast.success('Заметка создана!')
        navigate(`/notes/${data.id}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTag = async () => {
    if (!newTag.trim()) return
    try {
      const { data } = await api.post('/tags', { name: newTag.trim(), color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0') })
      setTags((prev) => [...prev, data])
      setForm((f) => ({ ...f, tag_ids: [...f.tag_ids, data.id] }))
      setNewTag('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка создания тега')
    }
  }

  const toggleTag = (tagId) => {
    const id = Number(tagId)
    setForm((f) => ({
      ...f,
      tag_ids: f.tag_ids.map(Number).includes(id)
        ? f.tag_ids.filter((x) => Number(x) !== id)
        : [...f.tag_ids, id],
    }))
  }

  const toggleLink = (noteId) => {
    const id = Number(noteId)
    setForm((f) => ({
      ...f,
      linked_note_ids: f.linked_note_ids.map(Number).includes(id)
        ? f.linked_note_ids.filter((x) => Number(x) !== id)
        : [...f.linked_note_ids, id],
    }))
  }

  const filteredNotes = allNotes.filter((n) =>
    n.title.toLowerCase().includes(linkSearch.toLowerCase())
  )

  if (loading) return <PageLoader />

  return (
    <div className="h-full flex flex-col">
      {/* Тулбар */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-bg-secondary flex-shrink-0">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>

        <input
          className="input flex-1 h-9 text-lg font-semibold bg-transparent border-0 focus:ring-0 px-2"
          placeholder="Название заметки..."
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <div className="flex items-center gap-2">
          {/* Публикация */}
          <button
            onClick={() => setForm({ ...form, is_published: !form.is_published })}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all ${
              form.is_published
                ? 'bg-green-500/15 border-green-500/40 text-green-400'
                : 'bg-bg-tertiary border-border text-text-muted'
            }`}
          >
            {form.is_published ? <Globe size={14} /> : <Lock size={14} />}
            {form.is_published ? 'Опублик.' : 'Черновик'}
          </button>

          {/* Предпросмотр */}
          <button
            onClick={() => setPreview(!preview)}
            className="btn-secondary flex items-center gap-2 text-sm h-9 px-3"
          >
            {preview ? <EyeOff size={14} /> : <Eye size={14} />}
            {preview ? 'Редактор' : 'Просмотр'}
          </button>

          {/* Сохранить */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm h-9"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Сохранить
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Редактор / Превью */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {preview ? (
            <div className="h-full overflow-auto thin-scroll p-8 max-w-4xl mx-auto">
              {content ? (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-text-muted italic text-center py-20">Пустой контент</p>
              )}
            </div>
          ) : (
            <div ref={editorRef} className="h-full" />
          )}
        </div>

        {/* Боковая панель */}
        <div className="w-72 border-l border-border bg-bg-secondary overflow-auto thin-scroll flex-shrink-0">
          <div className="p-4 space-y-6">
            {/* Теги */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-text-secondary text-sm font-medium">
                <Tag size={14} className="text-accent-purple-light" /> Теги
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="tag-chip text-xs cursor-pointer transition-all"
                    style={
                      form.tag_ids.map(Number).includes(Number(tag.id))
                        ? { backgroundColor: tag.color + '35', borderColor: tag.color + '80', color: tag.color }
                        : { backgroundColor: tag.color + '10', borderColor: tag.color + '30', color: tag.color + '80' }
                    }
                  >
                    {form.tag_ids.map(Number).includes(Number(tag.id)) && '✓ '}
                    {tag.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input text-xs h-8 flex-1"
                  placeholder="Новый тег..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                />
                <button onClick={handleCreateTag} className="btn-secondary p-1.5 h-8 w-8 flex items-center justify-center">
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {/* Связанные заметки */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-text-secondary text-sm font-medium">
                <Link2 size={14} className="text-accent-purple-light" /> Связи
              </div>
              <input
                className="input text-xs h-8 mb-2"
                placeholder="Поиск заметок..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
              />
              <div className="space-y-1 max-h-48 overflow-auto thin-scroll">
                {filteredNotes.slice(0, 20).map((note) => (
                  <button
                    key={note.id}
                    onClick={() => toggleLink(note.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all ${
                      form.linked_note_ids.map(Number).includes(Number(note.id))
                        ? 'bg-accent-purple/20 border border-accent-purple/50 text-accent-purple-light'
                        : 'hover:bg-bg-tertiary text-text-muted border border-transparent'
                    }`}
                  >
                    {form.linked_note_ids.map(Number).includes(Number(note.id)) && '✓ '}
                    {note.title}
                  </button>
                ))}
              </div>

              {/* Выбранные связи */}
              {form.linked_note_ids.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-text-muted mb-1">Выбрано ({form.linked_note_ids.length}):</div>
                  {form.linked_note_ids.map((lid) => {
                    const ln = allNotes.find((n) => Number(n.id) === Number(lid))
                    return ln ? (
                      <div key={lid} className="flex items-center gap-1.5">
                        <span className="text-xs text-accent-purple-light flex-1 truncate">{ln.title}</span>
                        <button onClick={() => toggleLink(lid)} className="text-text-muted hover:text-red-400">
                          <X size={12} />
                        </button>
                      </div>
                    ) : null
                  })}
                </div>
              )}
            </div>

            {/* Справка по Markdown */}
            <div className="p-3 bg-bg-card border border-border rounded-xl">
              <div className="text-xs font-medium text-text-secondary mb-2">Markdown</div>
              <div className="space-y-1 font-mono text-xs text-text-muted">
                {[
                  ['# Заголовок 1', 'h1'],
                  ['**жирный**', 'bold'],
                  ['*курсив*', 'italic'],
                  ['```код```', 'code'],
                  ['- пункт', 'list'],
                  ['> цитата', 'quote'],
                ].map(([syntax]) => (
                  <div key={syntax} className="text-text-muted/70">{syntax}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
