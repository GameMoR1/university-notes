import { motion } from 'framer-motion'

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={`${sizes[size]} ${className}`}>
      <div className="w-full h-full border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-text-muted text-sm animate-pulse">Загрузка...</p>
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-bg-tertiary border border-border flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-text-muted" />
        </div>
      )}
      <h3 className="text-text-primary font-semibold text-lg mb-2">{title}</h3>
      {description && <p className="text-text-muted text-sm max-w-sm mb-6">{description}</p>}
      {action}
    </motion.div>
  )
}

export function Badge({ children, color = 'purple' }) {
  const colors = {
    purple: 'bg-accent-purple/20 text-accent-purple-light border-accent-purple/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    gray: 'bg-bg-tertiary text-text-muted border-border',
  }
  return (
    <span className={`tag-chip ${colors[color]}`}>{children}</span>
  )
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, danger = false }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <h3 className="text-text-primary font-semibold text-lg mb-2">{title}</h3>
        <p className="text-text-secondary text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary text-sm">Отмена</button>
          <button
            onClick={onConfirm}
            className={danger ? 'btn-danger text-sm' : 'btn-primary text-sm'}
          >
            Подтвердить
          </button>
        </div>
      </motion.div>
    </div>
  )
}
