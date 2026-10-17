// Birthdays, marriage anniversaries and death anniversaries for a period.
export const FILTERS = { today: 'Today', week: 'This Week', month: 'This Month', next: 'Next Month', prev: 'Previous Month' }

function range(f) {
  const t = new Date(); t.setHours(0, 0, 0, 0)
  if (f === 'today') return [t, t]
  if (f === 'week') {
    const s = new Date(t); s.setDate(t.getDate() - t.getDay())
    const e = new Date(s); e.setDate(s.getDate() + 6); return [s, e]
  }
  const k = f === 'next' ? 1 : f === 'prev' ? -1 : 0
  return [new Date(t.getFullYear(), t.getMonth() + k, 1), new Date(t.getFullYear(), t.getMonth() + k + 1, 0)]
}

export function eventsFor(filter, members, unions) {
  const live = (i) => members[i] && !members[i].deleted
  const base = []
  Object.values(members).filter((m) => !m.deleted).forEach((m) => {
    base.push({ icon: '🎂', date: m.birth_date, text: `${m.first_name}’s birthday` })
    if (m.date_of_death) base.push({ icon: '🕯️', date: m.date_of_death, text: `Remembering ${m.first_name}` })
  })
  Object.values(unions).forEach((u) => {
    if (u.marriage_date && live(u.partner_a_id) && live(u.partner_b_id))
      base.push({ icon: '💍', date: u.marriage_date, text: `${members[u.partner_a_id].first_name} & ${members[u.partner_b_id].first_name} anniversary` })
  })
  const [s, e] = range(filter), out = []
  base.forEach((v) => {
    const mo = +v.date.slice(5, 7) - 1, d = +v.date.slice(8, 10), by = +v.date.slice(0, 4)
    for (let y = s.getFullYear(); y <= e.getFullYear(); y++) {
      const dt = new Date(y, mo, d)
      if (dt >= s && dt <= e) out.push({ ...v, dt, years: y - by })
    }
  })
  return out.sort((a, b) => a.dt - b.dt)
}
