import { useState } from 'react'
import { addMember, updateMember, setDeleted } from './store'
import { FILTERS, eventsFor } from './dates'

export function Sheet({ onClose, children }) {
  return (
    <div className="sw">
      <div className="bd" onClick={onClose} />
      <div className="sh"><div className="grab" />{children}</div>
    </div>
  )
}

const empty = { first_name: '', gender: 'male', birth_date: '', date_of_death: '', profession: '', interests: '' }

function Fields({ f, set, disabled }) {
  const inp = (label, k, type = 'text') => (
    <><label>{label}</label><input type={type} value={f[k] || ''} disabled={disabled} onChange={(e) => set({ ...f, [k]: e.target.value })} /></>
  )
  return (
    <>
      {inp('First name', 'first_name')}
      <label>Gender</label>
      <select value={f.gender} disabled={disabled} onChange={(e) => set({ ...f, gender: e.target.value })}>
        <option value="male">Male (square)</option><option value="female">Female (circle)</option>
      </select>
      <div className="row"><div>{inp('Birth date', 'birth_date', 'date')}</div><div>{inp('Date of death (optional)', 'date_of_death', 'date')}</div></div>
      {inp('Profession', 'profession')}{inp('Interests', 'interests')}
    </>
  )
}
const invalid = (f) => (!f.first_name.trim() || !f.birth_date) && 'Name and birth date are required (no partial records).'

export function InfoSheet({ id, store, admin, onClose }) {
  const { members, unions, setRoot } = store, m = members[id]
  const [f, set] = useState({ ...empty, ...m })
  const [err, setErr] = useState('')
  const u = Object.values(unions).find((x) => x.partner_a_id === id || x.partner_b_id === id)
  const sp = u && members[u.partner_a_id === id ? u.partner_b_id : u.partner_a_id]
  const pu = m.parent_union_id && unions[m.parent_union_id]
  const nm = (i) => members[i]?.first_name
  return (
    <Sheet onClose={onClose}>
      <h3>{m.first_name}</h3>
      <div className="mu">{sp && !sp.deleted && `Spouse: ${sp.first_name}. `}{pu && `Parents: ${nm(pu.partner_a_id)} & ${nm(pu.partner_b_id)}.`}</div>
      <Fields f={f} set={set} disabled={!admin} />
      <div className="err">{err}</div>
      <button className="btn" onClick={() => { setRoot(id); onClose() }}>Set as root</button>
      {admin && <>
        <button className="btn s" onClick={() => { const e = invalid(f); if (e) return setErr(e); updateMember(id, f); onClose() }}>Save</button>
        <button className="btn w" onClick={() => { setDeleted(id, true); onClose() }}>Remove</button>
      </>}
      <button className="btn s" onClick={onClose}>Close</button>
    </Sheet>
  )
}

export function AddSheet({ store, onClose }) {
  const { members, unions } = store
  const live = Object.values(members).filter((m) => !m.deleted)
  const [f, set] = useState(empty), [type, setType] = useState('child'), [who, setWho] = useState('')
  const [ut, setUt] = useState('marriage'), [md, setMd] = useState(''), [err, setErr] = useState('')
  const hasUnion = (i) => Object.values(unions).some((u) => u.partner_a_id === i || u.partner_b_id === i)
  const alive = (i) => members[i] && !members[i].deleted
  const opts = type === 'child'
    ? Object.values(unions).filter((u) => alive(u.partner_a_id) || alive(u.partner_b_id)).map((u) => [u.id, `${members[u.partner_a_id]?.first_name} & ${members[u.partner_b_id]?.first_name}`])
    : live.filter((m) => !hasUnion(m.id)).map((m) => [m.id, m.first_name])
  const target = opts.some(([v]) => v === who) ? who : opts[0]?.[0] || ''
  const first = live.length === 0
  const submit = () => {
    const e = invalid(f) || (!first && !target && 'Pick who this member relates to.')
    if (e) return setErr(e)
    const rel = first ? null : type === 'child' ? { type, unionId: target } : { type, withId: target, union_type: ut, marriage_date: md }
    const id = addMember(f, rel)
    if (first) store.setRoot(id)
    onClose()
  }
  return (
    <Sheet onClose={onClose}>
      <h3>Add member</h3>
      <Fields f={f} set={set} />
      {first ? <p className="mu">This will be the first member of the tree.</p> : <>
        <label>Relationship</label>
        <select value={type} onChange={(e) => setType(e.target.value)}><option value="child">Child of a couple</option><option value="spouse">Spouse of</option></select>
        <label>Who</label>
        <select value={target} onChange={(e) => setWho(e.target.value)}>{opts.length ? opts.map(([v, l]) => <option key={v} value={v}>{l}</option>) : <option value="">(none available)</option>}</select>
        {type === 'spouse' && <>
          <label>Union type</label><select value={ut} onChange={(e) => setUt(e.target.value)}><option>marriage</option><option>informal</option></select>
          <label>Marriage date (optional)</label><input type="date" value={md} onChange={(e) => setMd(e.target.value)} />
        </>}
      </>}
      <div className="err">{err}</div>
      <button className="btn" onClick={submit}>Add</button><button className="btn s" onClick={onClose}>Cancel</button>
    </Sheet>
  )
}

export function DatesSheet({ members, unions, onClose }) {
  const [filter, setFilter] = useState('month')
  const ev = eventsFor(filter, members, unions)
  return (
    <Sheet onClose={onClose}>
      <h3>Family dates</h3>
      <div className="chips">{Object.entries(FILTERS).map(([k, l]) => <span key={k} className={'chip' + (k === filter ? ' on' : '')} onClick={() => setFilter(k)}>{l}</span>)}</div>
      {ev.length ? ev.map((e, i) => (
        <div className="ev" key={i}><div>{e.icon}</div><div>{e.text}<br />
          <small>{e.dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}{e.years > 0 && ` · ${e.years} years`}</small></div></div>
      )) : <p className="mu">No dates in this period.</p>}
    </Sheet>
  )
}

export function DeletedSheet({ members, admin, onClose }) {
  const l = Object.values(members).filter((m) => m.deleted)
  return (
    <Sheet onClose={onClose}>
      <h3>Removed members</h3>
      {l.length ? l.map((m) => (
        <div className="ev" key={m.id}><div style={{ flex: 1 }}>{m.first_name}<br /><small>Born {m.birth_date}</small></div>
          {admin && <button className="chip" onClick={() => setDeleted(m.id, false)}>Restore</button>}</div>
      )) : <p className="mu">No one has been removed.</p>}
    </Sheet>
  )
}
