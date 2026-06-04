import { FileIcon, FileImage, FileText, Film, Music, FileArchive, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Превращает одинарные \n в <br> для markdown */
function withBreaks(text) {
  return text.replace(/(?<!\n)\n(?!\n)/g, '  \n')
}

function getFileIcon(mimeType) {
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.startsWith('audio/')) return Music
  if (mimeType.startsWith('text/') || mimeType.includes('pdf') || mimeType.includes('document')) return FileText
  if (mimeType.includes('zip') || mimeType.includes('rar')) return FileArchive
  return FileIcon
}

export default function FileEmbed({ file }) {
  if (!file) return null

  if (file.mime_type.startsWith('image/')) {
    return (
      <span className="block my-4">
        <img
          src={`/api/files/${file.id}/preview`}
          alt={file.original_name}
          className="max-w-full rounded-xl border border-border shadow-lg"
          loading="lazy"
        />
      </span>
    )
  }

  if (file.mime_type.startsWith('video/')) {
    return (
      <span className="block my-4">
        <video
          src={`/api/files/${file.id}/preview`}
          controls
          className="max-w-full rounded-xl border border-border"
          style={{ maxHeight: '70vh' }}
        >
          Ваш браузер не поддерживает видео
        </video>
      </span>
    )
  }

  if (file.mime_type.startsWith('audio/')) {
    return (
      <span className="block my-4">
        <audio src={`/api/files/${file.id}/preview`} controls className="w-full">
          Ваш браузер не поддерживает аудио
        </audio>
      </span>
    )
  }

  if (file.mime_type === 'application/pdf') {
    return (
      <span className="block my-4">
        <iframe
          src={`/api/files/${file.id}/preview`}
          className="w-full rounded-xl border border-border"
          style={{ height: '70vh' }}
          title={file.original_name}
        />
      </span>
    )
  }

  const Icon = getFileIcon(file.mime_type)
  return (
    <span className="block my-4">
      <a
        href={`/api/files/${file.id}/download`}
        download={file.original_name}
        className="inline-flex items-center gap-3 px-4 py-3 bg-bg-card border border-border rounded-xl hover:border-accent-purple/50 hover:bg-accent-purple/5 transition-all group"
      >
        <span className="p-2 rounded-lg bg-accent-purple/10 text-accent-purple-light">
          <Icon size={20} />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-medium text-text-primary group-hover:text-accent-purple-light transition-colors">
            {file.original_name}
          </span>
          <span className="text-xs text-text-muted">
            {file.file_size >= 1024 * 1024
              ? `${(file.file_size / (1024 * 1024)).toFixed(1)} MB`
              : `${(file.file_size / 1024).toFixed(0)} KB`}
          </span>
        </span>
        <Download size={14} className="text-text-muted group-hover:text-accent-purple-light ml-auto transition-colors" />
      </a>
    </span>
  )
}

/**
 * Рендерит markdown-контент с поддержкой встроенных файлов.
 * Разбивает текст по маркерам ![name](file:ID) и рендерит FileEmbed между сегментами,
 * сохраняя корректную структуру markdown внутри каждого текстового блока.
 */
export function MarkdownWithFiles({ content, files }) {
  if (!content) return null

  const parts = []
  let lastIndex = 0
  const re = /!\[([^\]]*)\]\(file:(\d+)\)/g
  let match

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    const fileId = parseInt(match[2], 10)
    const file = files?.find(f => f.id === fileId)
    parts.push({ type: 'file', file, fileId })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) })
  }

  if (parts.length === 0) return null
  if (parts.length === 1 && parts[0].type === 'text') {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{withBreaks(parts[0].content)}</ReactMarkdown>
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return (
            <div key={`t-${i}`} className="inline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{withBreaks(part.content)}</ReactMarkdown>
            </div>
          )
        }
        if (part.file) {
          return <FileEmbed key={`f-${part.file.id}`} file={part.file} />
        }
        return (
          <span key={`e-${part.fileId}`} className="text-sm text-red-400 italic block my-4">
            Файл (ID: {part.fileId}) не найден
          </span>
        )
      })}
    </>
  )
}