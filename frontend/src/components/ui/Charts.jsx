import { useMemo } from 'react'

const COLORS = ['#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#3b82f6']
const PAD = { top: 4, right: 8, bottom: 4, left: 8 }

export function BarChart({ data, keys, labels, height = 140 }) {
  const dims = useMemo(() => {
    if (!data?.length) return null
    const w = 600
    const h = height
    const iw = w - PAD.left - PAD.right
    const ih = h - PAD.top - PAD.bottom
    const yMax = Math.max(...data.map(d => Math.max(...keys.map(k => d[k] || 0))), 1)
    const count = data.length
    const gap = 4
    const barW = Math.max(6, (iw - gap * (count - 1)) / count)

    const bars = data.map((d, i) => {
      const bx = PAD.left + i * (barW + gap)
      const vals = keys.map(k => ({ key: k, value: d[k] || 0 }))
      let yOff = 0
      const segs = vals.map(v => {
        const sh = (v.value / yMax) * ih
        const seg = { x: bx, y: PAD.top + ih - yOff - sh, w: barW, h: sh, ...v }
        yOff += sh
        return seg
      })
      return segs
    }).flat()

    return { bars, vb: `0 0 ${w} ${h}` }
  }, [data, keys, height])

  if (!dims) return null
  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={dims.vb} className="w-full h-full overflow-hidden" preserveAspectRatio="none">
        {dims.bars.map((s, i) => (
          <rect
            key={i}
            x={s.x}
            y={s.y}
            width={s.w}
            height={Math.max(0, s.h)}
            fill={COLORS[keys.indexOf(s.key) % COLORS.length]}
            rx={2}
            opacity={0.85}
          />
        ))}
      </svg>
      {labels && (
        <div className="flex justify-center gap-4 -mt-1">
          {keys.map((k, i) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {labels[i] || k}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LineChart({ data, keys, labels, height = 140 }) {
  const dims = useMemo(() => {
    if (!data?.length) return null
    const w = 600
    const h = height
    const iw = w - PAD.left - PAD.right
    const ih = h - PAD.top - PAD.bottom
    const yMax = Math.max(...data.map(d => Math.max(...keys.map(k => d[k] || 0))), 1)
    const count = data.length

    const lines = keys.map((key, ki) => {
      const pts = data.map((d, i) => ({
        x: PAD.left + (count > 1 ? (i / (count - 1)) * iw : iw / 2),
        y: PAD.top + ih - ((d[key] || 0) / yMax) * ih,
      }))
      return { key, pts, d: pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') }
    })

    return { lines, vb: `0 0 ${w} ${h}` }
  }, [data, keys, height])

  if (!dims) return null
  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={dims.vb} className="w-full h-full overflow-hidden" preserveAspectRatio="none">
        {dims.lines.map((line, i) => (
          <g key={line.key}>
            <path d={line.d} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {line.pts.map((pt, j) => (
              <circle key={j} cx={pt.x} cy={pt.y} r={3} fill={COLORS[i % COLORS.length]} />
            ))}
          </g>
        ))}
      </svg>
      {labels && (
        <div className="flex justify-center gap-4 -mt-1">
          {keys.map((k, i) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {labels[i] || k}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
