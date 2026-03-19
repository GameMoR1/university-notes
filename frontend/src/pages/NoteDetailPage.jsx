import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import { PageLoader, ConfirmModal } from '@/components/ui/Common'
import toast from 'react-hot-toast'
import {
  Edit, Trash2, Globe, Lock, Eye, MessageSquare,
  Link2, Clock, User, Send, CheckCircle, Reply, ChevronDown, ChevronRight
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ru } from 'date-fns/locale'

function CommentItem({ comment, noteId, onRefresh, depth = 0 }) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const user = useAuthStore((s) => s.user)
  const canCreateNotes = useAuthStore((s) => s.canCreateNotes)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isOwn = comment.author?.id === user?.id

  const handleReply = async () => {
    if (!replyText.trim()) return
    try {
      await api.post(`/notes/${noteId}/comments`, { content: replyText.trim(), parent_id: comment.id })
      setReplyText('')
      setReplying(false)
      onRefresh()
    } catch (err) {
      const d = err.response?.data?.detail
      toast.error(typeof d === 'string' ? d : 'Ошибка при отправке ответа')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/comments/${comment.id}`)
      toast.success('Комментарий удалён')
      onRefresh()
    } catch {
      toast.error('Ошибка удаления')
    }
  }

  const handleMarkAnswer = async () => {
    try {
      await api.post(`/comments/${comment.id}/mark-answer`)
      onRefresh()
    } catch {
      toast.error('Нет прав')
    }
  }

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-border pl-4' : ''}`}>
      <div className={`p-4 rounded-xl border transition-all ${
        comment.is_answer
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-border bg-bg-card/50'
      }`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center flex-shrink-0">
            <span className="text-accent-purple-light text-xs font-bold">
              {comment.author?.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-sm font-medium text-text-primary">{comment.author?.name}</span>
              {comment.is_answer && (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle size={11} /> Ответ
                </span>
              )}
              <span className="text-xs text-text-muted">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ru })}
              </span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">{comment.content}</p>

            {/* Действия */}
            <div className="flex items-center gap-3 mt-2">
              {user && (
                <button
                  onClick={() => setReplying(!replying)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-purple-light transition-colors"
                >
                  <Reply size={12} /> Ответить
                </button>
              )}
              {(canCreateNotes() || isAdmin()) && (
                <button
                  onClick={handleMarkAnswer}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-green-400 transition-colors"
                >
                  <CheckCircle size={12} /> {comment.is_answer ? 'Снять' : 'Отметить ответом'}
                </button>
              )}
              {(isOwn || isAdmin()) && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} /> Удалить
                </button>
              )}
              {comment.replies?.length > 0 && (
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors ml-auto"
                >
                  {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  {comment.replies.length} ответ(а)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Форма ответа */}
        {replying && (
          <div className="mt-3 flex gap-2">
            <input
              className="input text-sm h-9"
              placeholder="Ваш ответ..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleReply()
                }
              }}
            />
            <button onClick={handleReply} className="btn-primary text-sm px-3 h-9">
              <Send size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Вложенные ответы */}
      {!collapsed && comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} noteId={noteId} onRefresh={onRefresh} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function NoteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [deleteModal, setDeleteModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const user = useAuthStore((s) => s.user)
  const canCreateNotes = useAuthStore((s) => s.canCreateNotes)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const canComment = useAuthStore((s) => s.canComment)

  const loadNote = async () => {
    try {
      const { data } = await api.get(`/notes/${id}`)
      setNote(data)
    } catch (err) {
      toast.error('Заметка не найдена')
      navigate('/notes')
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    try {
      const { data } = await api.get(`/notes/${id}/comments`)
      setComments(data)
    } catch {}
  }

  useEffect(() => {
    loadNote()
    loadComments()
  }, [id])

  const handleDelete = async () => {
    try {
      await api.delete(`/notes/${id}`)
      toast.success('Заметка удалена')
      navigate('/notes')
    } catch {
      toast.error('Ошибка удаления')
    }
  }

  const handlePublish = async () => {
    try {
      const { data } = await api.post(`/notes/${id}/publish`)
      setNote(data)
      toast.success(data.is_published ? 'Заметка опубликована' : 'Заметка снята с публикации')
    } catch {
      toast.error('Ошибка')
    }
  }

  const handleAddComment = async () => {
    const text = newComment.trim()
    if (!text) return
    setSubmitting(true)
    try {
      await api.post(`/notes/${id}/comments`, { content: text })
      setNewComment('')
      await loadComments()
      toast.success('Комментарий добавлен')
    } catch (err) {
      const d = err.response?.data?.detail
      toast.error(typeof d === 'string' ? d : 'Ошибка при добавлении комментария')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />
  if (!note) return null

  const isOwn = note.author?.id === user?.id
  const canEdit = canCreateNotes() || isAdmin()

  return (
    <div className="max-w-4xl mx-auto p-6">
      <ConfirmModal
        isOpen={deleteModal}
        title="Удалить заметку?"
        message={`"${note.title}" будет удалена безвозвратно.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(false)}
        danger
      />

      {/* Хедер заметки */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-text-primary leading-tight">{note.title}</h1>

          {(isOwn || canEdit) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handlePublish}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  note.is_published
                    ? 'bg-green-500/15 border-green-500/40 text-green-400 hover:bg-red-500/15 hover:border-red-500/40 hover:text-red-400'
                    : 'bg-bg-tertiary border-border text-text-muted hover:bg-green-500/15 hover:border-green-500/40 hover:text-green-400'
                }`}
                title={note.is_published ? 'Снять с публикации' : 'Опубликовать'}
              >
                {note.is_published ? <Globe size={14} /> : <Lock size={14} />}
                {note.is_published ? 'Опубл.' : 'Черновик'}
              </button>

              <button
                onClick={() => navigate(`/notes/${id}/edit`)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border bg-bg-tertiary text-text-muted hover:text-text-primary hover:border-border-light transition-all"
              >
                <Edit size={14} /> Изменить
              </button>

              <button
                onClick={() => setDeleteModal(true)}
                className="p-2 rounded-lg border border-red-500/20 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Мета */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted mb-4">
          <span className="flex items-center gap-1.5">
            <User size={14} /> {note.author?.name}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {format(new Date(note.updated_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye size={14} /> {note.views_count} просмотров
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquare size={14} /> {comments.length} комментариев
          </span>
        </div>

        {/* Теги */}
        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {note.tags.map((tag) => (
              <span
                key={tag.id}
                className="tag-chip"
                style={{
                  backgroundColor: tag.color + '25',
                  borderColor: tag.color + '60',
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Связанные заметки */}
        {note.linked_notes?.length > 0 && (
          <div className="p-3 bg-bg-secondary border border-border rounded-xl mb-4">
            <div className="flex items-center gap-2 mb-2 text-text-muted text-xs font-medium">
              <Link2 size={13} /> Связанные заметки
            </div>
            <div className="flex flex-wrap gap-2">
              {note.linked_notes.map((ln) => (
                <Link
                  key={ln.id}
                  to={`/notes/${ln.id}`}
                  className="text-xs text-accent-purple-light hover:underline bg-accent-purple/10 border border-accent-purple/30 px-2.5 py-1 rounded-lg transition-all hover:bg-accent-purple/20"
                >
                  {ln.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Контент */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-bg-card border border-border rounded-2xl p-8 mb-8"
      >
        {note.content ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-text-muted italic text-center py-8">Заметка пока пуста</p>
        )}
      </motion.div>

      {/* Комментарии */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <MessageSquare size={18} className="text-accent-purple-light" />
          Вопросы и обсуждение
          <span className="text-sm text-text-muted font-normal">({comments.length})</span>
        </h2>

        {/* Форма добавления */}
        {canComment() ? (
          <div className="flex gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center flex-shrink-0">
              <span className="text-accent-purple-light text-xs font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 flex gap-2">
              <input
                className="input text-sm"
                placeholder="Задайте вопрос или оставьте комментарий..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddComment()
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || submitting}
                className="btn-primary text-sm px-3 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={14} /> Отправить
              </button>
            </div>
          </div>
        ) : (
          <p className="text-text-muted text-sm mb-4">
            <Link to="/login" className="text-accent-purple-light hover:underline">Войдите</Link>, чтобы оставлять комментарии
          </p>
        )}

        {/* Список комментариев */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Комментариев пока нет. Будьте первым!
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} noteId={id} onRefresh={loadComments} />
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
