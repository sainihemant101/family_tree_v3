// Pure layout: turns members + unions into positioned nodes and SVG path strings.
export const SL = 84, GY = 140, R = 20

export function computeLayout({ members, unions, root, mode, collapsed }) {
  const live = (i) => members[i] && !members[i].deleted
  const list = Object.values(unions)
  const uOf = (i) => list.find((u) => u.partner_a_id === i || u.partner_b_id === i)
  const o = { nodes: [], lines: [], mar: [], btns: [] }
  if (!root || !live(root)) return o

  const down = (i) => {
    const u = uOf(i), other = u && (u.partner_a_id === i ? u.partner_b_id : u.partner_a_id)
    const sp = other && live(other) ? other : null
    const kidIds = u ? u.children_ids.filter(live) : []
    const kids = kidIds.length && !collapsed.includes(i) ? kidIds.map(down) : []
    const kw = kids.reduce((a, k) => a + k.w, 0)
    return { id: i, sp, has: kidIds.length > 0, kids, kw, w: Math.max(sp ? 2 : 1, kw) }
  }
  const pd = (n, l, d) => {
    const cx = l + n.w / 2, y = d * GY, mx = cx * SL
    n.y = y; n.x = (n.sp ? cx - 0.5 : cx) * SL
    o.nodes.push({ id: n.id, x: n.x, y })
    if (n.sp) {
      o.nodes.push({ id: n.sp, x: (cx + 0.5) * SL, y })
      o.mar.push(`M${n.x + R},${y}H${(cx + 0.5) * SL - R}`)
    }
    let k = l + (n.w - n.kw) / 2
    n.kids.forEach((c) => { pd(c, k, d + 1); k += c.w })
    if (n.has) o.btns.push({ id: n.id, x: mx, y: y + 58, open: n.kids.length > 0 })
    if (n.kids.length) {
      const by = y + GY * 0.72, xs = n.kids.map((c) => c.x)
      o.lines.push(`M${mx},${y}V${by}`, `M${Math.min(...xs, mx)},${by}H${Math.max(...xs, mx)}`)
      n.kids.forEach((c) => o.lines.push(`M${c.x},${by}V${c.y - R}`))
    }
  }
  const up = (i) => {
    const u = members[i].parent_union_id && unions[members[i].parent_union_id]
    const ps = u ? [u.partner_a_id, u.partner_b_id].filter(live).map(up) : []
    return { id: i, ps, w: Math.max(1, ps.reduce((a, p) => a + p.w, 0)) }
  }
  const pu = (n, l, d) => {
    let k = l
    n.ps.forEach((p) => { pu(p, k, d + 1); k += p.w })
    n.y = -d * GY
    n.x = n.ps.length ? n.ps.reduce((a, p) => a + p.x, 0) / n.ps.length : (l + n.w / 2) * SL
    o.nodes.push({ id: n.id, x: n.x, y: n.y })
    if (n.ps.length) {
      const py = n.ps[0].y
      if (n.ps.length === 2) o.mar.push(`M${n.ps[0].x + R},${py}H${n.ps[1].x - R}`)
      o.lines.push(`M${n.x},${py}V${n.y - R}`)
    }
  }
  mode === 'down' ? pd(down(root), 0, 0) : pu(up(root), 0, 0)
  return o
}
