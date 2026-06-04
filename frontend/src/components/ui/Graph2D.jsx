import { useRef, useEffect, useState, useCallback, useMemo } from 'react'

const getCssVar = (name) => {
  if (typeof document === 'undefined') return '6 6 10'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const COLORS = {
  bg: () => `rgb(${getCssVar('--bg-graph')})`,
  labelPill: () => {
    const v = getCssVar('--bg-graph').split(/\s+/).slice(0, 3).join(', ')
    return `rgba(${v}, 0.8)`
  },
  node: '#7c3aed',
  nodeDim: '#2a2a35',
  edge: '#6d28d9',
  edgeBright: '#a78bfa',
  label: '#9d9aae',
  labelActive: '#f1f0f5',
  glow: '#7c3aed',
}

function forceLayout(nodes, edges, width, height) {
  const positions = {}
  const velocities = {}
  const centerX = width / 2
  const centerY = height / 2

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length
    const radius = Math.min(width, height) * 0.3 + Math.random() * 50
    positions[node.id] = { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius }
    velocities[node.id] = { vx: 0, vy: 0 }
  })

  const iterations = 60
  const repulsion = 8000
  const attraction = 0.005
  const damping = 0.85
  const minDist = 60

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = positions[nodes[i].id]
        const b = positions[nodes[j].id]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = repulsion / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        velocities[nodes[i].id].vx += fx
        velocities[nodes[i].id].vy += fy
        velocities[nodes[j].id].vx -= fx
        velocities[nodes[j].id].vy -= fy
      }
    }

    edges.forEach(({ source, target }) => {
      const sp = positions[source]
      const tp = positions[target]
      if (!sp || !tp) return
      const dx = tp.x - sp.x
      const dy = tp.y - sp.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (dist - minDist) * attraction
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      velocities[source].vx += fx
      velocities[source].vy += fy
      velocities[target].vx -= fx
      velocities[target].vy -= fy
    })

    nodes.forEach((node) => {
      const p = positions[node.id]
      velocities[node.id].vx += (centerX - p.x) * 0.001
      velocities[node.id].vy += (centerY - p.y) * 0.001
    })

    nodes.forEach((node) => {
      const v = velocities[node.id]
      v.vx *= damping
      v.vy *= damping
      positions[node.id].x += v.vx
      positions[node.id].y += v.vy
    })
  }

  return positions
}

function getNodeColor(node, isDimmed) {
  if (isDimmed) return COLORS.nodeDim
  const links = node.links_count || 0
  const hue = Math.max(230, 270 - links * 8)
  return `hsl(${hue}, 70%, ${Math.max(40, 65 - links * 2)}%)`
}

export default function Graph2D({
  nodes,
  edges,
  selectedId,
  hoveredId,
  focusIds,
  highlightActive,
  onNodeClick,
  onNodeHover,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const animRef = useRef(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const positionsRef = useRef({})
  const draggingRef = useRef(false)
  const dragNodeRef = useRef(null)
  const panStartRef = useRef({ x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const nodeMap = useMemo(() => {
    const m = {}
    nodes.forEach((n) => { m[n.id] = n })
    return m
  }, [nodes])

  const basePositions = useMemo(
    () => forceLayout(nodes, edges, dimensions.width, dimensions.height),
    [nodes, edges, dimensions.width, dimensions.height]
  )

  useEffect(() => {
    positionsRef.current = JSON.parse(JSON.stringify(basePositions))
  }, [basePositions])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const ctx = canvas.getContext('2d')
    let t = 0

    const resize = () => {
      const W = dimensions.width
      const H = dimensions.height
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.scale(dpr, dpr)
    }
    resize()

    const transformPoint = (x, y) => ({
      tx: (x + offsetRef.current.x) * scaleRef.current,
      ty: (y + offsetRef.current.y) * scaleRef.current,
    })

    const render = () => {
      t += 0.016
      const W = dimensions.width
      const H = dimensions.height

      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = COLORS.bg()
      ctx.fillRect(0, 0, W, H)
      ctx.restore()

      // Stars
      ctx.save()
      for (let i = 0; i < 120; i++) {
        const sx = ((i * 137.5 + 50) % W)
        const sy = ((i * 97.3 + 20) % H)
        const ss = 0.5 + Math.sin(t + i * 0.7) * 0.5
        ctx.globalAlpha = 0.15 + ss * 0.25
        ctx.fillStyle = '#c4b5fd'
        ctx.beginPath()
        ctx.arc(sx, sy, 0.6 + ss * 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      // Edges
      edges.forEach(({ source, target }) => {
        const sp = positionsRef.current[source]
        const tp = positionsRef.current[target]
        if (!sp || !tp) return

        const isFocused = highlightActive && focusIds && (focusIds.has(source) && focusIds.has(target))
        const opacity = !highlightActive ? 0.45 : isFocused ? 0.85 : 0.08

        ctx.save()
        ctx.globalAlpha = opacity
        ctx.strokeStyle = isFocused ? COLORS.edgeBright : COLORS.edge
        ctx.lineWidth = isFocused ? 2 : 1.5
        ctx.shadowColor = isFocused ? COLORS.edgeBright : COLORS.edge
        ctx.shadowBlur = isFocused ? 8 : 2

        const { tx: x1, ty: y1 } = transformPoint(sp.x, sp.y)
        const { tx: x2, ty: y2 } = transformPoint(tp.x, tp.y)
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        ctx.restore()
      })

      // Nodes
      nodes.forEach((node) => {
        const pos = positionsRef.current[node.id]
        if (!pos) return
        const { tx, ty } = transformPoint(pos.x, pos.y)
        const isSelected = selectedId === node.id
        const isHovered = hoveredId === node.id
        const isDimmed = highlightActive && focusIds && !focusIds.has(node.id)

        const baseSize = 8 + Math.min((node.links_count || 0) * 2, 10) + Math.min((node.views_count || 0) * 0.1, 4)
        const pulse = Math.sin(t * 1.5 + node.id) * 1.5
        const size = isSelected ? baseSize * 1.3 : isHovered ? baseSize * 1.15 : baseSize + pulse * 0.3
        const color = getNodeColor(node, isDimmed)

        // Glow
        ctx.save()
        const glowRadius = size * 3
        const gradient = ctx.createRadialGradient(tx, ty, 0, tx, ty, glowRadius)
        gradient.addColorStop(0, isSelected ? 'rgba(124, 58, 237, 0.3)' : isHovered ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.06)')
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(tx, ty, glowRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Node circle
        ctx.save()
        ctx.shadowColor = isSelected ? COLORS.glow : isHovered ? COLORS.glow : 'transparent'
        ctx.shadowBlur = isSelected ? 16 : isHovered ? 8 : 0
        ctx.globalAlpha = isDimmed && !isSelected && !isHovered ? 0.5 : 1
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(tx, ty, size, 0, Math.PI * 2)
        ctx.fill()

        if (isSelected) {
          ctx.strokeStyle = '#a78bfa'
          ctx.lineWidth = 2
          ctx.stroke()
        }
        ctx.restore()

        // Label
        if (scaleRef.current > 0.35) {
          ctx.save()
          ctx.globalAlpha = isDimmed && !isSelected && !isHovered ? 0.35 : 1
          const fontSize = isSelected ? 13 : isHovered ? 12 : 11
          ctx.font = `${isSelected ? '600' : '500'} ${fontSize}px Inter, system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          const label = node.title.length > 30 ? node.title.slice(0, 28) + '…' : node.title

          // Label background pill
          const textW = ctx.measureText(label).width
          const pad = 6
          const pillX = tx - textW / 2 - pad
          const pillY = ty + size + 3
          const pillH = fontSize + 8
          ctx.fillStyle = COLORS.labelPill()
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.beginPath()
          const r = 4
          ctx.moveTo(pillX + r, pillY)
          ctx.lineTo(pillX + textW + pad * 2 - r, pillY)
          ctx.quadraticCurveTo(pillX + textW + pad * 2, pillY, pillX + textW + pad * 2, pillY + r)
          ctx.lineTo(pillX + textW + pad * 2, pillY + pillH - r)
          ctx.quadraticCurveTo(pillX + textW + pad * 2, pillY + pillH, pillX + textW + pad * 2 - r, pillY + pillH)
          ctx.lineTo(pillX + r, pillY + pillH)
          ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - r)
          ctx.lineTo(pillX, pillY + r)
          ctx.quadraticCurveTo(pillX, pillY, pillX + r, pillY)
          ctx.closePath()
          ctx.fill()

          ctx.fillStyle = isSelected ? '#a78bfa' : isHovered ? '#f1f0f5' : COLORS.label
          ctx.fillText(label, tx, ty + size + 5)
          ctx.restore()
        }

        if (node.links_count > 0 && scaleRef.current > 0.5) {
          ctx.save()
          ctx.globalAlpha = 0.3
          ctx.fillStyle = '#a78bfa'
          for (let i = 0; i < Math.min(node.links_count, 3); i++) {
            const angle = (Math.PI * 2 * i) / Math.min(node.links_count, 3) - Math.PI / 2
            const dotX = tx + Math.cos(angle) * (size + 3)
            const dotY = ty + Math.sin(angle) * (size + 3)
            ctx.beginPath()
            ctx.arc(dotX, dotY, 1.2, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
        }
      })

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [nodes, edges, dimensions, selectedId, hoveredId, focusIds, highlightActive])

  const findNodeAt = useCallback((tx, ty) => {
    const x = tx / scaleRef.current - offsetRef.current.x
    const y = ty / scaleRef.current - offsetRef.current.y
    for (let i = nodes.length - 1; i >= 0; i--) {
      const pos = positionsRef.current[nodes[i].id]
      if (!pos) continue
      const dx = pos.x - x
      const dy = pos.y - y
      const baseSize = 8 + Math.min((nodes[i].links_count || 0) * 2, 10) + Math.min((nodes[i].views_count || 0) * 0.1, 4)
      if (Math.sqrt(dx * dx + dy * dy) < baseSize + 10) return nodes[i]
    }
    return null
  }, [nodes])

  const handleMouseDown = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const tx = e.clientX - rect.left
    const ty = e.clientY - rect.top
    const node = findNodeAt(tx, ty)
    if (node) {
      dragNodeRef.current = node
      draggingRef.current = true
    } else {
      dragNodeRef.current = null
      draggingRef.current = true
      panStartRef.current = { x: e.clientX, y: e.clientY }
    }
  }, [findNodeAt])

  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const tx = e.clientX - rect.left
    const ty = e.clientY - rect.top

    if (!draggingRef.current) {
      const node = findNodeAt(tx, ty)
      onNodeHover(node)
      canvasRef.current.style.cursor = node ? 'pointer' : 'default'
      return
    }

    if (dragNodeRef.current) {
      const x = tx / scaleRef.current - offsetRef.current.x
      const y = ty / scaleRef.current - offsetRef.current.y
      positionsRef.current = {
        ...positionsRef.current,
        [dragNodeRef.current.id]: { x, y },
      }
    } else {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      panStartRef.current = { x: e.clientX, y: e.clientY }
      offsetRef.current = {
        x: offsetRef.current.x + dx / scaleRef.current,
        y: offsetRef.current.y + dy / scaleRef.current,
      }
    }
  }, [findNodeAt, onNodeHover])

  const handleMouseUp = useCallback((e) => {
    if (dragNodeRef.current && draggingRef.current) {
      onNodeClick(dragNodeRef.current)
    }
    draggingRef.current = false
    dragNodeRef.current = null
  }, [onNodeClick])

  // Non-passive wheel listener for preventDefault
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const oldScale = scaleRef.current
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.15, Math.min(4, oldScale * delta))

      // Zoom towards cursor
      if (oldScale !== newScale) {
        offsetRef.current = {
          x: mouseX / newScale - mouseX / oldScale + offsetRef.current.x,
          y: mouseY / newScale - mouseY / oldScale + offsetRef.current.y,
        }
        scaleRef.current = newScale
      }
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden" style={{ background: COLORS.bg() }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { draggingRef.current = false; dragNodeRef.current = null; onNodeHover(null) }}
        className="w-full h-full"
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-text-muted pointer-events-none max-w-md text-center">
        Перетаскивание — панорама · Колесо — масштаб · Клик — фокус · Тащи узел — переместить
      </div>
    </div>
  )
}
