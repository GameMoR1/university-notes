import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Billboard, Sphere, Line, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/utils/api'
import { PageLoader, FolderSwitcher } from '@/components/ui/Common'
import { Network, Search, Layers, X, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

// ─── 3D Node ──────────────────────────────────────────────────────────────────
function NoteNode({ node, position, isSelected, isHovered, dimmed, onHover, onClick, scale = 1 }) {
  const meshRef = useRef()
  const glowRef = useRef()
  const [localHover, setLocalHover] = useState(false)

  const color = useMemo(() => {
    const links = node.links_count || 0
    const hue = Math.max(0, 220 - links * 25)
    const saturation = Math.min(100, 65 + links * 5)
    const sat = dimmed ? saturation * 0.35 : saturation
    const light = dimmed ? 38 : 68
    return `hsl(${hue}, ${sat}%, ${light}%)`
  }, [node, dimmed])

  const size = useMemo(() => {
    const base = 0.3
    const linksBonus = Math.min((node.links_count || 0) * 0.08, 0.3)
    const viewsBonus = Math.min((node.views_count || 0) * 0.005, 0.2)
    return (base + linksBonus + viewsBonus) * scale
  }, [node, scale])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime

    if (isSelected) {
      meshRef.current.rotation.y = t * 1.5
      meshRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08)
    } else if (isHovered || localHover) {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.06)
    } else {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 0.8 + node.id) * 0.025)
    }

    if (glowRef.current) {
      const baseGlow = dimmed ? 0.03 : 0.08
      glowRef.current.material.opacity = isSelected
        ? 0.4 + Math.sin(t * 3) * 0.15
        : isHovered || localHover
          ? 0.25 + Math.sin(t * 4) * 0.1
          : baseGlow + Math.sin(t * 0.8) * 0.03
    }
  })

  return (
    <group position={position}>
      {/* Glow sphere */}
      <Sphere ref={glowRef} args={[size * 2.2, 16, 16]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Main sphere */}
      <Sphere
        ref={meshRef}
        args={[size, 32, 32]}
        onClick={(e) => { e.stopPropagation(); onClick(node) }}
        onPointerOver={(e) => { e.stopPropagation(); setLocalHover(true); onHover(node) }}
        onPointerOut={() => { setLocalHover(false); onHover(null) }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={
            dimmed
              ? isSelected ? 0.5 : isHovered || localHover ? 0.25 : 0.06
              : isSelected ? 0.85 : isHovered || localHover ? 0.5 : 0.22
          }
          roughness={dimmed ? 0.45 : 0.2}
          metalness={dimmed ? 0.35 : 0.6}
          transparent
          opacity={dimmed && !isSelected && !isHovered && !localHover ? 0.55 : 1}
        />
      </Sphere>

      {/* Label */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Suspense fallback={null}>
          <Text
            position={[0, size + 0.12, 0]}
            fontSize={isSelected ? 0.14 : 0.10}
            color={
              dimmed && !isSelected && !isHovered && !localHover
                ? '#4a4a55'
                : isSelected ? '#a78bfa' : isHovered || localHover ? '#f1f0f5' : '#9d9aae'
            }
            anchorX="center"
            anchorY="bottom"
            maxWidth={2.5}
            outlineWidth={0.004}
            outlineColor="#0d0d0f"
          >
            {node.title.length > 28 ? node.title.slice(0, 26) + '…' : node.title}
          </Text>
        </Suspense>
      </Billboard>
    </group>
  )
}

// ─── 3D Edge ──────────────────────────────────────────────────────────────────
function NoteEdge({ start, end, opacity = 0.25, color = '#a78bfa' }) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ], [start, end])

  return (
    <Line
      points={points}
      color={color}
      lineWidth={4}
      transparent
      opacity={opacity}
      dashed={false}
    />
  )
}

// ─── Particles Background ─────────────────────────────────────────────────────
function ParticleField({ count = 800 }) {
  const pointsRef = useRef()
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40
    }
    return pos
  }, [count])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.05
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial color="#8b5cf6" size={0.022} transparent opacity={0.2} sizeAttenuation />
    </points>
  )
}

// ─── Мягкое «созвездие» на заднем плане ─────────────────────────────────────
function BackdropConstellation() {
  const groupRef = useRef()
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.012
    }
  })
  return (
    <group ref={groupRef} position={[0, 0, -24]}>
      <mesh>
        <ringGeometry args={[18, 22, 64]} />
        <meshBasicMaterial color="#2e1068" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0, 0.4]}>
        <ringGeometry args={[26, 26.15, 128]} />
        <meshBasicMaterial color="#4c1d95" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function GraphScene({
  nodes,
  edges,
  selectedId,
  hoveredId,
  focusIds,
  highlightActive,
  onNodeClick,
  onNodeHover,
  positions,
}) {
  const { camera, scene } = useThree()

  useEffect(() => {
    camera.position.set(0, 0, 18)
  }, [camera])

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#06060a', 0.045)
    return () => { scene.fog = null }
  }, [scene])

  return (
    <>
      <color attach="background" args={['#06060a']} />
      <ambientLight intensity={0.35} />
      <pointLight position={[10, 10, 10]} intensity={1.4} color="#7c3aed" />
      <pointLight position={[-10, -10, -10]} intensity={0.75} color="#3b82f6" />
      <pointLight position={[0, 15, 0]} intensity={0.45} color="#e9d5ff" />

      <Stars radius={100} depth={36} count={4200} factor={2.8} saturation={0} fade speed={0.35} />
      <BackdropConstellation />
      <ParticleField count={600} />

      {/* Edges */}
      {edges.map((edge, i) => {
        const startPos = positions[edge.source]
        const endPos = positions[edge.target]
        if (!startPos || !endPos) return null
        const touchesFocus =
          selectedId != null &&
          (edge.source === selectedId || edge.target === selectedId)
        const edgeBright = highlightActive && touchesFocus
        const opacity = !highlightActive ? 0.22 : edgeBright ? 0.92 : 0.07
        const lineColor = edgeBright ? '#ddd6fe' : '#4c3d6b'
        return (
          <NoteEdge
            key={`${edge.source}-${edge.target}-${i}`}
            start={startPos}
            end={endPos}
            opacity={opacity}
            color={lineColor}
          />
        )
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = positions[node.id]
        if (!pos) return null
        const dimmed = highlightActive && focusIds && !focusIds.has(node.id)
        return (
          <NoteNode
            key={node.id}
            node={node}
            position={pos}
            isSelected={selectedId === node.id}
            isHovered={hoveredId === node.id}
            dimmed={dimmed}
            onClick={onNodeClick}
            onHover={onNodeHover}
          />
        )
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        minDistance={3}
        maxDistance={50}
        makeDefault
      />
    </>
  )
}

// ─── Graph Layout (Force-directed 3D) ────────────────────────────────────────
function computePositions(nodes, edges) {
  const positions = {}
  const phi = Math.PI * (3 - Math.sqrt(5)) // golden angle

  nodes.forEach((node, i) => {
    const r = 5 + Math.sqrt(i) * 1.2
    const y = 1 - (i / (nodes.length - 1 || 1)) * 2
    const radius = Math.sqrt(1 - y * y)
    const theta = phi * i

    positions[node.id] = [
      Math.cos(theta) * radius * r,
      y * r * 0.6,
      Math.sin(theta) * radius * r,
    ]
  })

  // Простой стабильный force-layout
  for (let iter = 0; iter < 40; iter++) {
    edges.forEach(({ source, target }) => {
      const sp = positions[source]
      const tp = positions[target]
      if (!sp || !tp) return

      const dx = tp[0] - sp[0]
      const dy = tp[1] - sp[1]
      const dz = tp[2] - sp[2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1

      const dirX = dx / dist;
      const dirY = dy / dist;
      const dirZ = dz / dist;

      const force = (dist - 4) * 0.08;
      const clampedForce = Math.max(-0.8, Math.min(0.8, force));

      positions[source] = [sp[0] + dirX * clampedForce, sp[1] + dirY * clampedForce, sp[2] + dirZ * clampedForce]
      positions[target] = [tp[0] - dirX * clampedForce, tp[1] - dirY * clampedForce, tp[2] - dirZ * clampedForce]
    })
  }

  return positions
}

export default function GraphPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const folderId = searchParams.get('folder')

  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [folders, setFolders] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [showPanel, setShowPanel] = useState(true)
  const [folderName, setFolderName] = useState('')

  useEffect(() => {
    api.get('/folders').then(({ data }) => setFolders(data)).catch(() => {})
  }, [])

  // Link creation mode
  const [isLinkMode, setIsLinkMode] = useState(false)
  const [linkSource, setLinkSource] = useState(null)
  const { isLoggedIn, isAdmin, canCreateNotes } = useAuthStore()

  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api.get('/graph', { params: { folder_id: folderId } })
      .then(({ data }) => setGraphData(data))
      .catch(() => toast.error('Не удалось загрузить граф'))
      .finally(() => setLoading(false))
      
    if (folderId) {
        api.get('/folders').then(({ data }) => {
            const f = data.find(folder => folder.id === parseInt(folderId))
            if (f) setFolderName(f.name)
        })
    } else {
        setFolderName('')
    }
  }, [folderId])

  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter((n) => {
      const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase())
      const matchTag = !filterTag || n.tags?.some((t) => t.name === filterTag)
      return matchSearch && matchTag
    })
  }, [graphData.nodes, search, filterTag])

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id))
    return graphData.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
  }, [graphData.edges, filteredNodes])

  const positions = useMemo(
    () => computePositions(filteredNodes, filteredEdges),
    [filteredNodes, filteredEdges]
  )

  const highlightCenterId = isLinkMode ? linkSource?.id ?? null : selectedNode?.id ?? null

  const focusIds = useMemo(() => {
    if (highlightCenterId == null) return null
    const s = new Set([highlightCenterId])
    graphData.edges.forEach((e) => {
      if (e.source === highlightCenterId) s.add(e.target)
      if (e.target === highlightCenterId) s.add(e.source)
    })
    return s
  }, [highlightCenterId, graphData.edges])

  const highlightActive = highlightCenterId != null

  const allTags = useMemo(() => {
    const tagMap = {}
    graphData.nodes.forEach((n) => n.tags?.forEach((t) => { tagMap[t.name] = t }))
    return Object.values(tagMap)
  }, [graphData.nodes])

  const handleNodeClick = useCallback((node) => {
    if (isLinkMode) {
      if (!linkSource) {
        setLinkSource(node)
        toast('Выберите вторую заметку для связи', { icon: '🔗' })
      } else {
        if (linkSource.id !== node.id) {
          const isLinked = graphData.edges.some(e =>
            (e.source === linkSource.id && e.target === node.id) ||
            (e.source === node.id && e.target === linkSource.id)
          )

          if (isLinked) {
            api.delete('/graph/link', { data: { source_id: linkSource.id, target_id: node.id } })
              .then(() => {
                setGraphData(prev => ({
                  ...prev,
                  edges: prev.edges.filter(e => !(e.source === linkSource.id && e.target === node.id) && !(e.source === node.id && e.target === linkSource.id))
                }))
                toast.success('Связь удалена')
              })
              .catch(() => toast.error('Ошибка при удалении связи'))
          } else {
            api.post('/graph/link', { source_id: linkSource.id, target_id: node.id })
              .then(() => {
                setGraphData(prev => ({
                  ...prev,
                  edges: [...prev.edges, { source: linkSource.id, target: node.id }]
                }))
                toast.success('Связь создана')
              })
              .catch(() => toast.error('Ошибка при создании связи'))
          }
        }
        setLinkSource(null)
      }
    } else {
      setSelectedNode(node)
    }
  }, [isLinkMode, linkSource, graphData.edges])

  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node)
    document.body.style.cursor = node ? 'pointer' : 'default'
  }, [])

  const openNote = () => {
    if (selectedNode) navigate(`/notes/${selectedNode.id}`)
  }

  if (loading) return <PageLoader />

  return (
    <div className="h-full flex relative overflow-hidden bg-bg-primary">
      {/* Folder Switcher Over Graph */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-auto max-w-[90vw]">
        <FolderSwitcher
          folders={folders}
          selectedId={folderId}
          labelAll="Общий граф"
          onSelect={(id) => setSearchParams(prev => {
            if (id) prev.set('folder', id)
            else prev.delete('folder')
            return prev
          })}
        />
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 0, 18], fov: 60 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: '#06060a' }}
        >
          <GraphScene
            nodes={filteredNodes}
            edges={filteredEdges}
            selectedId={highlightCenterId}
            hoveredId={hoveredNode?.id}
            focusIds={focusIds}
            highlightActive={highlightActive}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            positions={positions}
          />
        </Canvas>

        {/* Статистика поверх canvas */}
        <div className="absolute top-4 left-4 flex items-center gap-3 pointer-events-none">
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-3 text-sm">
            <Network size={16} className="text-accent-purple-light" />
            <span className="text-text-muted">{filteredNodes.length} заметок</span>
            <span className="text-border">|</span>
            <span className="text-text-muted">{filteredEdges.length} связей</span>
          </div>
        </div>

        {/* Тост при наведении */}
        <AnimatePresence>
          {hoveredNode && !selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-2.5 pointer-events-none max-w-xs text-center"
            >
              <div className="text-sm font-medium text-text-primary">{hoveredNode.title}</div>
              <div className="text-xs text-text-muted mt-0.5">
                {hoveredNode.views_count} просм. · {hoveredNode.comments_count} комм. · {hoveredNode.links_count} связей
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Подсказка */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-text-muted pointer-events-none max-w-md text-center">
          Перетаскивание — вращение · Колесо — масштаб · Клик — фокус: соседи светлее, остальные приглушены
        </div>
      </div>

      {/* Правая панель */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-80 bg-bg-secondary border-l border-border flex flex-col overflow-hidden"
          >
            {/* Заголовок */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Layers size={16} className="text-accent-purple-light" /> 
                {folderName ? `Граф: ${folderName}` : 'Граф знаний'}
              </h3>
              <div className="flex items-center gap-1">
                {isLoggedIn() && (isAdmin() || canCreateNotes()) && (
                  <button
                    onClick={() => {
                      setIsLinkMode(!isLinkMode)
                      setLinkSource(null)
                      if (!isLinkMode) toast('Режим связей: выберите первый узел', { icon: '🔗' })
                    }}
                    className={`p-1.5 rounded-lg transition-all ${isLinkMode ? 'bg-accent-purple text-white' : 'text-text-muted hover:bg-bg-tertiary'}`}
                    title="Инструмент создания связей"
                  >
                    <Network size={16} />
                  </button>
                )}
                <button onClick={() => setShowPanel(false)} className="text-text-muted hover:text-text-secondary p-1.5">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Поиск */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input pl-8 h-9 text-sm"
                  placeholder="Поиск по заметкам..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilterTag('')}
                    className={`tag-chip text-xs transition-all ${!filterTag
                      ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple-light'
                      : 'bg-bg-tertiary border-border text-text-muted'
                      }`}
                  >
                    Все
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() => setFilterTag(filterTag === tag.name ? '' : tag.name)}
                      className="tag-chip text-xs transition-all"
                      style={
                        filterTag === tag.name
                          ? { backgroundColor: tag.color + '30', borderColor: tag.color + '80', color: tag.color }
                          : { backgroundColor: tag.color + '10', borderColor: tag.color + '30', color: tag.color + '99' }
                      }
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Выбранный узел */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 border-b border-border bg-accent-purple/5"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="font-semibold text-text-primary text-sm leading-snug">{selectedNode.title}</h4>
                    <button onClick={() => setSelectedNode(null)} className="text-text-muted hover:text-text-secondary flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
                    <span className="flex items-center gap-1"><Eye size={11} /> {selectedNode.views_count}</span>
                    <span>{selectedNode.comments_count} комм.</span>
                    <span>{selectedNode.links_count} связей</span>
                    <span className={selectedNode.is_published ? 'text-green-400' : ''}>
                      {selectedNode.is_published ? '● Опубл.' : '○ Черновик'}
                    </span>
                  </div>

                  {selectedNode.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {selectedNode.tags.map((t) => (
                        <span
                          key={t.id}
                          className="tag-chip text-xs"
                          style={{ backgroundColor: t.color + '25', borderColor: t.color + '60', color: t.color }}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={openNote}
                    className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                  >
                    <Eye size={14} /> Открыть заметку
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Список узлов */}
            <div className="flex-1 overflow-auto thin-scroll p-2">
              {filteredNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all group ${selectedNode?.id === node.id
                    ? 'bg-accent-purple/20 border border-accent-purple/40'
                    : 'hover:bg-bg-tertiary border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: node.tags?.[0]?.color || (node.is_published ? '#7c3aed' : '#4b5563') }}
                    />
                    <span className="text-sm text-text-primary font-medium truncate">{node.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted ml-4">
                    <span>{node.links_count} связей</span>
                    <span><Eye size={10} className="inline" /> {node.views_count}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопка открытия панели */}
      {!showPanel && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowPanel(true)}
          className="absolute right-4 top-4 glass rounded-xl p-3 hover:bg-bg-hover transition-all"
        >
          <Layers size={18} className="text-accent-purple-light" />
        </motion.button>
      )}
    </div>
  )
}
