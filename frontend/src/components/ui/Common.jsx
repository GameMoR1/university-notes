import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

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

export function InputModal({ isOpen, title, placeholder, value, onChange, onConfirm, onCancel, loading = false }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <h3 className="text-text-primary font-semibold text-lg mb-4">{title}</h3>
        <input
          autoFocus
          className="input w-full mb-6"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && onConfirm()}
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary text-sm px-4">Отмена</button>
          <button
            onClick={onConfirm}
            disabled={loading || !value.trim()}
            className="btn-primary text-sm px-6 flex items-center gap-2"
          >
            {loading && <Spinner size="sm" />}
            Сохранить
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function FolderSwitcher({ folders, selectedId, onSelect, showAll = true, labelAll = 'Общий вид' }) {
  const allFolders = showAll ? [{ id: 'all', name: labelAll }, ...folders] : folders

  return (
    <div className="flex items-center gap-1 p-1 bg-bg-secondary/50 backdrop-blur-md border border-white/5 rounded-2xl overflow-x-auto thin-scroll no-scrollbar mb-8">
      <div className="flex items-center gap-1">
        {allFolders.map((f) => {
          const isActive = String(selectedId || 'all') === String(f.id)
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id === 'all' ? null : f.id)}
              className={`relative px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap rounded-xl ${isActive ? 'text-white' : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                }`}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-accent-purple rounded-xl -z-10 shadow-lg shadow-accent-purple/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </AnimatePresence>
              {f.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CustomSelect({ value, onChange, options, placeholder = 'Выберите...', className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => String(o.value) === String(value))

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input flex items-center justify-between gap-2 h-10 w-full text-sm group transition-all hover:border-accent-purple/50"
      >
        <span className={`${selectedOption ? 'text-text-primary uppercase tracking-tight font-bold text-[10px]' : 'text-text-muted text-[10px] uppercase font-bold text-center w-full'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent-purple' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="absolute z-[100] top-full left-0 right-0 mt-2 bg-bg-secondary/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden"
          >
            <div className="max-h-60 overflow-auto p-1.5 thin-scroll">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all ${String(option.value) === String(value)
                      ? 'bg-accent-purple text-white shadow-lg shadow-accent-purple/20'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
