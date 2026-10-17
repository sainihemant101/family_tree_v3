import { create } from 'zustand'
import { collection, doc, onSnapshot, writeBatch, arrayUnion } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from './firebase'

export const useStore = create((set) => ({
  user: null, role: null, loading: true,
  members: {}, unions: {},
  root: null, mode: 'down', collapsed: [],
  setRoot: (root) => set({ root, collapsed: [] }),
  setMode: (mode) => set({ mode }),
  toggle: (id) => set((s) => ({
    collapsed: s.collapsed.includes(id) ? s.collapsed.filter((x) => x !== id) : [...s.collapsed, id]
  }))
}))

let unsubs = [], dataOn = false
const clear = () => { unsubs.forEach((u) => u()); unsubs = []; dataOn = false }
const toMap = (snap) => Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))

function subscribeData() {
  dataOn = true
  unsubs.push(onSnapshot(collection(db, 'members'), (snap) => {
    const members = toMap(snap), all = Object.values(members).filter((m) => !m.deleted)
    useStore.setState((s) => ({
      members,
      root: s.root && members[s.root] && !members[s.root].deleted
        ? s.root : (all.find((m) => !m.parent_union_id) || all[0] || {}).id || null
    }))
  }))
  unsubs.push(onSnapshot(collection(db, 'unions'), (snap) => useStore.setState({ unions: toMap(snap) })))
}

export function start() {
  onAuthStateChanged(auth, (user) => {
    clear()
    useStore.setState({ user, role: null, members: {}, unions: {}, loading: !!user })
    if (!user) return
    const email = (user.email || '').toLowerCase()
    unsubs.push(onSnapshot(doc(db, 'access', email), (snap) => {
      const role = snap.exists() ? snap.data().role : null
      useStore.setState({ role, loading: false })
      if (role && !dataOn) subscribeData()
    }, () => useStore.setState({ role: null, loading: false })))
  })
}

/* ---- writes: not awaited, so the UI updates optimistically from the local cache ---- */
const uuid = () => crypto.randomUUID()
const clean = (d) => ({
  first_name: d.first_name.trim(), gender: d.gender, birth_date: d.birth_date,
  profession: (d.profession || '').trim(), interests: (d.interests || '').trim(),
  date_of_death: d.date_of_death || null
})

export function addMember(data, rel) {
  const id = uuid(), b = writeBatch(db)
  const m = { id, ...clean(data), parent_union_id: null, deleted: false }
  if (rel?.type === 'child') {
    m.parent_union_id = rel.unionId
    b.update(doc(db, 'unions', rel.unionId), { children_ids: arrayUnion(id) })
  }
  b.set(doc(db, 'members', id), m)
  if (rel?.type === 'spouse') {
    const uid = uuid()
    b.set(doc(db, 'unions', uid), {
      id: uid, partner_a_id: rel.withId, partner_b_id: id,
      union_type: rel.union_type || 'marriage', marriage_date: rel.marriage_date || null, children_ids: []
    })
  }
  b.commit().catch(console.error)
  return id
}

export const updateMember = (id, data) => {
  const b = writeBatch(db); b.update(doc(db, 'members', id), clean(data)); b.commit().catch(console.error)
}
export const setDeleted = (id, deleted) => {
  const b = writeBatch(db)
  b.update(doc(db, 'members', id), { deleted, deleted_at: deleted ? new Date().toISOString() : null })
  b.commit().catch(console.error)
}

export function seedSample() {
  const b = writeBatch(db), ms = {}, us = {}
  const P = (k, n, g, bd, pr, i) => { const id = uuid(); ms[k] = { id, first_name: n, gender: g, birth_date: bd, profession: pr, interests: i, parent_union_id: null, date_of_death: null, deleted: false } }
  const U = (k, a, bb, d) => { const id = uuid(); us[k] = { id, partner_a_id: ms[a].id, partner_b_id: ms[bb].id, union_type: 'marriage', marriage_date: d, children_ids: [] } }
  const C = (u, p) => { us[u].children_ids.push(ms[p].id); ms[p].parent_union_id = us[u].id }
  P('rg', 'Raghav', 'male', '1948-03-12', 'Teacher (retired)', 'Chess'); P('si', 'Sita', 'female', '1951-07-04', 'Homemaker', 'Music')
  P('ar', 'Arun', 'male', '1975-10-17', 'Engineer', 'Cycling'); P('la', 'Latha', 'female', '1979-02-14', 'Architect', 'Painting')
  P('me', 'Meera', 'female', '1978-12-02', 'Doctor', 'Reading'); P('ki', 'Kiran', 'male', '1977-10-25', 'Chef', 'Travel')
  P('de', 'Dev', 'male', '2008-04-09', 'Student', 'Football'); P('an', 'Anya', 'female', '2012-10-20', 'Student', 'Drawing'); P('ri', 'Riya', 'female', '2011-08-30', 'Student', 'Dance')
  U('u1', 'rg', 'si', '1972-05-20'); U('u2', 'ar', 'me', '2005-01-30'); U('u3', 'la', 'ki', '2008-11-15')
  C('u1', 'ar'); C('u1', 'la'); C('u2', 'de'); C('u2', 'an'); C('u3', 'ri')
  Object.values(ms).forEach((m) => b.set(doc(db, 'members', m.id), m))
  Object.values(us).forEach((u) => b.set(doc(db, 'unions', u.id), u))
  b.commit().catch(console.error)
}
