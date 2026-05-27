import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Download, CheckCircle, XCircle, Loader2, FileIcon, X } from 'lucide-react'

const ICONS = {
  upload: Upload,
  download: Download,
}

const LABELS = {
  upload: 'Загрузка',
  download: 'Скачивание',
}

export default function FileProgress({ file, progress, status, type = 'upload', onDismiss }) {
  const Icon = ICONS[type]
  const label = LABELS[type]
  const isDone = status === 'completed'
  const isError = status === 'error'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className={`p-4 rounded-2xl border bg-bg-card overflow-hidden ${
          isDone ? 'border-green-500/40' : isError ? 'border-red-500/40' : 'border-border-light'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isDone
              ? 'bg-green-500/20 text-green-400'
              : isError
                ? 'bg-red-500/20 text-red-400'
                : 'bg-accent-purple/20 text-accent-purple-light'
          }`}>
            {isDone ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                <CheckCircle size={20} />
              </motion.div>
            ) : isError ? (
              <XCircle size={20} />
            ) : (
              <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
                <Loader2 size={18} />
              </motion.div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={12} className="text-text-muted flex-shrink-0" />
              <span className="text-sm font-medium text-text-primary truncate">{file?.name || 'Файл'}</span>
              {isDone && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-green-400 flex-shrink-0"
                >
                  Готово
                </motion.span>
              )}
              {isError && (
                <span className="text-xs text-red-400 flex-shrink-0">Ошибка</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: isDone
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : isError
                        ? '#ef4444'
                        : 'linear-gradient(90deg, #7c3aed, #a855f7)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progress)}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-mono text-text-muted w-10 text-right tabular-nums flex-shrink-0">
                {Math.round(progress)}%
              </span>
            </div>

            {!isDone && progress > 0 && progress < 100 && (
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                className="h-0.5 mt-1"
              >
                <motion.div
                  className="h-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.5), transparent)',
                  }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
              </motion.div>
            )}

            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-text-muted/60">
                {!isDone && !isError
                  ? `${label}...`
                  : isDone
                    ? `${label} завершена`
                    : `${label} не удалась`
                }
              </span>
              {size(file?.size, progress)}
            </div>
          </div>

          {onDismiss && (isDone || isError) && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all flex-shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function size(bytes, progress = 100) {
  if (!bytes) return null
  const total = bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`
  if (progress < 100) {
    const loaded = bytes * (progress / 100)
    const done = loaded >= 1024 * 1024
      ? `${(loaded / (1024 * 1024)).toFixed(1)} MB`
      : `${(loaded / 1024).toFixed(0)} KB`
    return <span className="text-[10px] text-text-muted/60">{done} / {total}</span>
  }
  return <span className="text-[10px] text-text-muted/60">{total}</span>
}
