import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import FileProgress from '@/components/ui/FileProgress'
import { MarkdownWithFiles } from '@/components/ui/FileEmbed'
import api from '@/utils/api'
import { PageLoader, CustomSelect } from '@/components/ui/Common'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import {
  Save, Eye, EyeOff, ArrowLeft, Tag, Link2, X, Plus,
  Globe, Lock, Loader2, Folder, Bold, Italic, Heading1,
  Heading2, Heading3, List, ListOrdered, Quote, Code2,
  Minus, Link, Image, TextSelect, HelpCircle,
  Paperclip, Upload, FileIcon, FileImage, FileText, Film, Music,
  FileArchive, Download, Trash2, Maximize2
} from 'lucide-react'

export default function NoteEditPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialFolderId = searchParams.get('folder')

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [content, setContent] = useState('')

  const [form, setForm] = useState({
    title: '',
    is_published: false,
    tag_ids: [],
    linked_note_ids: [],
    folder_id: initialFolderId ? parseInt(initialFolderId) : null,
  })

  const [tags, setTags] = useState([])
  const [folders, setFolders] = useState([])
  const [allNotes, setAllNotes] = useState([])
  const [newTag, setNewTag] = useState('')
  const [linkSearch, setLinkSearch] = useState('')
  const [noteFiles, setNoteFiles] = useState([])
  const [uploadState, setUploadState] = useState(null) // { file, progress, status }
  const [previewFile, setPreviewFile] = useState(null)

  const editorRef = useRef(null)
  const editorViewRef = useRef(null)
  const fileInputRef = useRef(null)
  const noteFilesRef = useRef(noteFiles)
  noteFilesRef.current = noteFiles
  const [showHelp, setShowHelp] = useState(false)

  // Форматирование: вставка/обёртывание синтаксиса
  const insertFormat = useCallback((before, after, blockPrefix = null) => {
    const view = editorViewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)
    const doc = view.state.doc

    if (blockPrefix) {
      // Блочное форматирование (заголовки, списки, цитаты)
      const line = doc.lineAt(from)
      const lineText = doc.sliceString(line.from, line.to)
      const hasPrefix = lineText.startsWith(blockPrefix.trim())
      const insert = hasPrefix
        ? lineText.replace(new RegExp(`^${blockPrefix.replace(/\s/g, '\\s')}?`), '')
        : blockPrefix + lineText

      view.dispatch({
        changes: { from: line.from, to: line.to, insert },
        selection: { anchor: line.from + insert.length },
      })
      setContent(view.state.doc.toString())
      return
    }

    if (selected) {
      // Обёртываем выделение
      const wrapped = before + selected + after
      view.dispatch({
        changes: { from, to, insert: wrapped },
        selection: { anchor: from, head: from + wrapped.length },
      })
    } else {
      // Вставляем с плейсхолдером
      const placeholder = before === '**' ? 'жирный текст'
        : before === '*' ? 'курсив'
        : before === '`' ? 'код'
        : before === '**' ? 'ссылка'
        : 'текст'
      const wrapped = before + placeholder + after
      view.dispatch({
        changes: { from, to, insert: wrapped },
        selection: { anchor: from + before.length, head: from + before.length + placeholder.length },
      })
    }
    view.focus()
    setContent(view.state.doc.toString())
  }, [])

  // Вставка ссылки
  const insertLink = useCallback(() => {
    const view = editorViewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)
    const text = selected || 'текст ссылки'
    const url = 'https://'
    const linkText = `[${text}](${url})`
    view.dispatch({
      changes: { from, to, insert: linkText },
      selection: { anchor: from + text.length + 2, head: from + text.length + 2 + url.length },
    })
    view.focus()
    setContent(view.state.doc.toString())
  }, [])

  // Вставка изображения
  const insertImage = useCallback(() => {
    const view = editorViewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    const alt = view.state.sliceDoc(from, to) || 'описание'
    const imgText = `![${alt}](https://)`
    view.dispatch({
      changes: { from, to, insert: imgText },
      selection: { anchor: from + alt.length + 4, head: from + alt.length + 4 + 8 },
    })
    view.focus()
    setContent(view.state.doc.toString())
  }, [])

  // Вставка разделителя
  const insertHR = useCallback(() => {
    const view = editorViewRef.current
    if (!view) return
    const { from } = view.state.selection.main
    const line = view.state.doc.lineAt(from)
    const insert = '\n\n---\n\n'
    view.dispatch({
      changes: { from: line.to, to: line.to, insert },
      selection: { anchor: line.to + insert.length },
    })
    view.focus()
    setContent(view.state.doc.toString())
  }, [])

  const FORMAT_BUTTONS = [
    { icon: Bold, title: 'Жирный (Ctrl+B)', action: () => insertFormat('**', '**') },
    { icon: Italic, title: 'Курсив (Ctrl+I)', action: () => insertFormat('*', '*') },
    { icon: Code2, title: 'Код (Ctrl+Shift+C)', action: () => insertFormat('`', '`') },
    { icon: Heading1, title: 'Заголовок 1', action: () => insertFormat('', '', '# ') },
    { icon: Heading2, title: 'Заголовок 2', action: () => insertFormat('', '', '## ') },
    { icon: Heading3, title: 'Заголовок 3', action: () => insertFormat('', '', '### ') },
    { icon: List, title: 'Маркированный список', action: () => insertFormat('', '', '- ') },
    { icon: ListOrdered, title: 'Нумерованный список', action: () => insertFormat('', '', '1. ') },
    { icon: Quote, title: 'Цитата', action: () => insertFormat('', '', '> ') },
    { icon: Link, title: 'Ссылка', action: insertLink },
    { icon: Image, title: 'Изображение', action: insertImage },
    { icon: Minus, title: 'Разделитель', action: insertHR },
  ]

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
        EditorView.domEventHandlers({
          drop: (event) => {
            const fileId = event.dataTransfer?.getData('text/file-id')
            if (!fileId) return false
            event.preventDefault()
            const file = noteFilesRef.current.find(f => f.id === parseInt(fileId))
            if (!file) return true
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
            if (pos === null) return true
            const insertText = `![${file.original_name}](file:${file.id})`
            view.dispatch({
              changes: { from: pos, to: pos, insert: insertText }
            })
            view.focus()
            return true
          },
          dragover: (event) => {
            event.preventDefault()
            return false
          },
        }),
      ],
      parent: editorRef.current,
    })

    editorViewRef.current = view
    return () => {
      view.destroy()
      editorViewRef.current = null
    }
  }, [preview, loading])

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
        const promises = [
          api.get('/tags'),
          api.get('/notes', { params: { per_page: 100, published_only: false } }),
          api.get('/folders'),
        ]
        if (isEdit) {
          promises.push(api.get(`/notes/${id}/files`))
        }
        const [tagsRes, notesRes, foldersRes, filesRes] = await Promise.all(promises)
        setTags(tagsRes.data)
        setAllNotes(notesRes.data.items.filter((n) => String(n.id) !== String(id)))
        setFolders(foldersRes.data)
        if (isEdit && filesRes) {
          setNoteFiles(filesRes.data)
        }

        if (isEdit) {
          const { data } = await api.get(`/notes/${id}`)
          setForm({
            title: data.title,
            is_published: data.is_published,
            tag_ids: (data.tags || []).map((t) => Number(t.id)),
            linked_note_ids: (data.linked_notes || []).map((n) => Number(n.id)),
            folder_id: data.folder_id,
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

  // Загрузка файлов
  const loadNoteFiles = useCallback(async () => {
    if (!isEdit) return
    try {
      const { data } = await api.get(`/notes/${id}/files`)
      setNoteFiles(data)
    } catch {}
  }, [id, isEdit])

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 50 MB)')
      return
    }
    setUploadState({ file, progress: 0, status: 'uploading' })
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post(`/notes/${id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 0
          setUploadState(prev => prev ? { ...prev, progress: pct } : prev)
        },
      })
      setUploadState({ file, progress: 100, status: 'completed' })
      await loadNoteFiles()
      setTimeout(() => { setUploadState(null) }, 2500)
    } catch (err) {
      setUploadState({ file, progress: 0, status: 'error' })
      toast.error(err.response?.data?.detail || 'Ошибка загрузки')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteFile = async (fileId) => {
    try {
      await api.delete(`/files/${fileId}`)
      toast.success('Файл удалён')
      setNoteFiles(prev => prev.filter(f => f.id !== fileId))
    } catch {
      toast.error('Ошибка удаления файла')
    }
  }

  function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return FileImage
    if (mimeType.startsWith('video/')) return Film
    if (mimeType.startsWith('audio/')) return Music
    if (mimeType.startsWith('text/') || mimeType.includes('pdf') || mimeType.includes('document')) return FileText
    if (mimeType.includes('zip') || mimeType.includes('rar')) return FileArchive
    return FileIcon
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
  }

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
        navigate(`/notes/${data.id}/edit`)
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

      {/* Панель форматирования */}
      {!preview && (
        <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-border bg-bg-secondary/80 flex-shrink-0 overflow-x-auto thin-scroll no-scrollbar">
          {FORMAT_BUTTONS.map(({ icon: Icon, title, action }) => (
            <button
              key={title}
              onClick={action}
              title={title}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all flex-shrink-0"
            >
              <Icon size={16} />
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-2 flex-shrink-0" />
          <button
            onClick={() => setShowHelp(!showHelp)}
            title="Подсказка по форматированию"
            className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${showHelp ? 'bg-accent-purple/20 text-accent-purple-light' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'}`}
          >
            <HelpCircle size={16} />
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Редактор / Превью */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {!preview && showHelp && (
            <div className="flex-shrink-0 border-b border-border bg-bg-secondary/50">
              <div className="flex gap-6 px-6 py-3 overflow-x-auto thin-scroll text-xs">
                {[
                  { label: 'Жирный', syntax: '**текст**', example: '**Привет**' },
                  { label: 'Курсив', syntax: '*текст*', example: '*Привет*' },
                  { label: 'Заголовок', syntax: '# текст', example: '# Заголовок' },
                  { label: 'Список', syntax: '- пункт', example: '- Пункт 1\n- Пункт 2' },
                  { label: 'Нумерация', syntax: '1. пункт', example: '1. Шаг 1\n2. Шаг 2' },
                  { label: 'Цитата', syntax: '> текст', example: '> Важная мысль' },
                  { label: 'Код', syntax: '`код`', example: '`console.log()`' },
                  { label: 'Ссылка', syntax: '[текст](url)', example: '[Гугл](https://google.com)' },
                  { label: 'Картинка', syntax: '![alt](url)', example: '![Кот](https://...)' },
                  { label: 'Разделитель', syntax: '---', example: '---' },
                ].map(({ label, syntax, example }) => (
                  <div key={label} className="flex flex-col gap-0.5 min-w-fit">
                    <span className="font-medium text-text-primary whitespace-nowrap">{label}</span>
                    <span className="font-mono text-text-muted whitespace-nowrap">{syntax}</span>
                    <span className="font-mono text-accent-purple-light/70 whitespace-nowrap">→ {example.replace(/\n/g, ' | ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview ? (
            <div className="h-full overflow-auto thin-scroll p-8 max-w-4xl mx-auto">
              {content ? (
                <div className="markdown-body">
                  <MarkdownWithFiles content={content} files={noteFiles} />
                </div>
              ) : (
                <p className="text-text-muted italic text-center py-20">Пустой контент</p>
              )}
            </div>
          ) : (
            <div ref={editorRef} className="flex-1" />
          )}
        </div>

        {/* Боковая панель */}
        <div className="w-72 border-l border-border bg-bg-secondary overflow-auto thin-scroll flex-shrink-0">
          <div className="p-4 space-y-6">
            {/* Папка */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-text-secondary text-sm font-medium">
                <Folder size={14} className="text-accent-purple-light" /> Папка
              </div>
              <CustomSelect
                value={form.folder_id || ''}
                onChange={(val) => setForm({ ...form, folder_id: val ? parseInt(val) : null })}
                options={[
                  { value: '', label: 'Без папки' },
                  ...folders.map((f) => ({ value: f.id, label: f.name }))
                ]}
                className="w-full"
              />
            </div>

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

            {/* Прикреплённые файлы */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-text-secondary text-sm font-medium">
                <Paperclip size={14} className="text-accent-purple-light" /> Файлы ({noteFiles.length})
              </div>

              {!isEdit && (
                <p className="text-xs text-text-muted mb-3">Сохраните заметку, чтобы прикрепить файлы</p>
              )}

              {noteFiles.length > 0 && (
                <div className="space-y-2 mb-3">
                  {noteFiles.map((file) => {
                    const Icon = getFileIcon(file.mime_type)
                    const isImage = file.mime_type.startsWith('image/')
                    return (
                      <div
                        key={file.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/file-id', String(file.id))
                          e.dataTransfer.effectAllowed = 'copy'
                        }}
                        onDoubleClick={() => setPreviewFile(file)}
                        className="group flex items-center gap-2 p-2 bg-bg-card border border-border rounded-lg hover:border-accent-purple/40 transition-all cursor-grab active:cursor-grabbing"
                      >
                        {isImage ? (
                          <img
                            src={`/api/files/${file.id}/preview`}
                            alt={file.original_name}
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <Icon size={14} className="text-text-muted flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-primary truncate">{file.original_name}</p>
                          <p className="text-[10px] text-text-muted">{formatFileSize(file.file_size)}</p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={`/api/files/${file.id}/download`}
                            download={file.original_name}
                            className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                            title="Скачать"
                          >
                            <Download size={11} />
                          </a>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1 rounded text-text-muted hover:text-red-400 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {uploadState && (
                <div className="mb-3">
                  <FileProgress
                    file={uploadState.file}
                    progress={uploadState.progress}
                    status={uploadState.status}
                    type="upload"
                    onDismiss={() => setUploadState(null)}
                  />
                </div>
              )}

              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleUploadFile}
                  className="hidden"
                  accept="*/*"
                />
                <button
                  onClick={() => isEdit ? fileInputRef.current?.click() : null}
                  disabled={!isEdit || uploadState?.status === 'uploading'}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-xs text-text-muted hover:text-accent-purple-light hover:border-accent-purple/50 transition-all disabled:opacity-50"
                >
                  <Upload size={14} />
                  {isEdit ? 'Загрузить файл' : 'Сначала сохраните заметку'}
                </button>
                {isEdit && <p className="text-[10px] text-text-muted/50 mt-1 text-center">до 50 MB</p>}
              </div>
            </div>

            {/* Визуальная справка */}
            <div className="p-3 bg-bg-card border border-border rounded-xl">
              <div className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                <TextSelect size={12} className="text-accent-purple-light" /> Быстрые клавиши
              </div>
              <div className="space-y-1.5 text-xs">
                {[
                  { keys: 'Ctrl+B', desc: 'Жирный текст' },
                  { keys: 'Ctrl+I', desc: 'Курсив' },
                  { keys: 'Ctrl+Shift+C', desc: 'Код' },
                  { keys: 'Выделите текст', desc: 'и нажмите кнопку на панели' },
                ].map(({ keys, desc }) => (
                  <div key={keys} className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border rounded text-text-muted font-mono text-[10px]">{keys}</kbd>
                    <span className="text-text-muted">{desc}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] text-text-muted/60 leading-relaxed">
                  Не беспокойтесь о синтаксисе — просто выделите текст и нажмите нужную кнопку на панели сверху.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Превью файла */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl max-h-[90vh] w-full flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary truncate">{previewFile.original_name}</h3>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/files/${previewFile.id}/download`}
                    download={previewFile.original_name}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Download size={12} /> Скачать
                  </a>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex-1 flex items-center justify-center min-h-[300px]">
                {previewFile.mime_type.startsWith('image/') ? (
                  <img
                    src={`/api/files/${previewFile.id}/preview`}
                    alt={previewFile.original_name}
                    className="max-w-full max-h-[75vh] object-contain"
                  />
                ) : previewFile.mime_type.startsWith('video/') ? (
                  <video
                    src={`/api/files/${previewFile.id}/preview`}
                    controls
                    className="max-w-full max-h-[75vh]"
                  >
                    Ваш браузер не поддерживает видео
                  </video>
                ) : previewFile.mime_type.startsWith('audio/') ? (
                  <audio src={`/api/files/${previewFile.id}/preview`} controls className="w-full max-w-md" />
                ) : previewFile.mime_type === 'application/pdf' ? (
                  <iframe
                    src={`/api/files/${previewFile.id}/preview`}
                    className="w-full h-[75vh]"
                    title={previewFile.original_name}
                  />
                ) : previewFile.mime_type.startsWith('text/') ? (
                  <iframe
                    src={`/api/files/${previewFile.id}/preview`}
                    className="w-full h-[75vh]"
                    title={previewFile.original_name}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 p-8">
                    <FileIcon size={48} className="text-text-muted" />
                    <p className="text-text-muted text-sm">Предпросмотр недоступен для этого типа файлов</p>
                    <a
                      href={`/api/files/${previewFile.id}/download`}
                      download={previewFile.original_name}
                      className="btn-primary text-sm flex items-center gap-2"
                    >
                      <Download size={14} /> Скачать файл
                    </a>
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
