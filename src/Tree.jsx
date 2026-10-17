import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { computeLayout, R } from './layout'

export default function Tree({ members, unions, root, mode, collapsed, onSelect, onToggle }) {
  const L = useMemo(() => computeLayout({ members, unions, root, mode, collapsed }), [members, unions, root, mode, collapsed])
  const svg = useRef(null), pts = useRef(new Map()), moved = useRef(0), tgt = useRef(null)
  const [V, setV] = useState({ k: 1, x: 0, y: 0 })
  const has = L.nodes.length > 0

  const zoom = (f, cx, cy) => setV((v) => {
    const r = svg.current.getBoundingClientRect(), px = cx - r.left, py = cy - r.top
    const k = Math.min(3, Math.max(0.2, v.k * f)); f = k / v.k
    return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f }
  })

  // Fit the tree to the screen when the root/mode changes (not on every collapse).
  useLayoutEffect(() => {
    if (!has || !svg.current) return
    const r = svg.current.getBoundingClientRect()
    const xs = L.nodes.map((n) => n.x), ys = L.nodes.map((n) => n.y)
    const x0 = Math.min(...xs) - 50, x1 = Math.max(...xs) + 50, y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 80
    const k = Math.min(1.2, r.width / (x1 - x0), r.height / (y1 - y0))
    setV({ k, x: r.width / 2 - (k * (x0 + x1)) / 2, y: r.height / 2 - (k * (y0 + y1)) / 2 })
  }, [root, mode, has]) // eslint-disable-line

  useEffect(() => {
    const el = svg.current
    const h = (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 0.9, e.clientX, e.clientY) }
    el.addEventListener('wheel', h, { passive: false })
    return () => el.removeEventListener('wheel', h)
  }, [])

  const down = (e) => {
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 1) { moved.current = 0; tgt.current = e.target } else moved.current = 99
    try { svg.current.setPointerCapture(e.pointerId) } catch {}
  }
  const move = (e) => {
    const p = pts.current.get(e.pointerId); if (!p) return
    const dx = e.clientX - p.x, dy = e.clientY - p.y
    if (pts.current.size === 1) {
      moved.current += Math.abs(dx) + Math.abs(dy)
      p.x = e.clientX; p.y = e.clientY
      setV((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
    } else if (pts.current.size === 2) {
      const o = [...pts.current].find(([k]) => k !== e.pointerId)[1]
      const d0 = Math.hypot(p.x - o.x, p.y - o.y); p.x = e.clientX; p.y = e.clientY
      const d1 = Math.hypot(p.x - o.x, p.y - o.y)
      if (d0) zoom(d1 / d0, (p.x + o.x) / 2, (p.y + o.y) / 2)
    }
  }
  const up = (e) => {
    pts.current.delete(e.pointerId)
    if (moved.current < 8 && pts.current.size === 0 && tgt.current?.closest) {
      const b = tgt.current.closest('[data-tog]'), n = tgt.current.closest('[data-id]')
      if (b) onToggle(b.dataset.tog); else if (n) onSelect(n.dataset.id)
    }
  }

  return (
    <svg ref={svg} className="tree" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={(e) => pts.current.delete(e.pointerId)}>
      <g transform={`translate(${V.x},${V.y}) scale(${V.k})`}>
        {L.lines.map((d, i) => <path key={'l' + i} className="ln" d={d} />)}
        {L.mar.map((d, i) => <path key={'m' + i} className="ln mar" d={d} />)}
        {L.nodes.map((n) => {
          const m = members[n.id], f = m.gender === 'female'
          return (
            <g key={n.id} data-id={n.id} transform={`translate(${n.x},${n.y})`}
               className={`n ${f ? 'f' : 'm'} ${m.date_of_death ? 'd' : ''} ${n.id === root ? 'r' : ''}`}>
              {f ? <circle r={R} /> : <rect x={-R} y={-R} width={2 * R} height={2 * R} rx="3" />}
              <text y={R + 14}>{m.first_name}</text>
            </g>
          )
        })}
        {L.btns.map((b) => (
          <g key={'b' + b.id} className="b" data-tog={b.id} transform={`translate(${b.x},${b.y})`}>
            <circle r="10" /><text>{b.open ? '−' : '+'}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}
