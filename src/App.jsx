import { useState } from 'react'
import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, provider } from './firebase'
import { useStore, seedSample } from './store'
import Tree from './Tree'
import { InfoSheet, AddSheet, DatesSheet, DeletedSheet } from './Sheets'

export default function App() {
  const store = useStore()
  const { user, role, loading, members, unions, root, mode, collapsed, setRoot, setMode, toggle } = store
  const [sheet, setSheet] = useState(null) // { type, id? }
  const admin = role === 'admin', close = () => setSheet(null)

  if (loading) return <div className="center">Loading…</div>
  if (!user) return (
    <div className="center"><h1>🌳 Family Tree</h1>
      <button className="btn" onClick={() => signInWithPopup(auth, provider).catch(console.error)}>Sign in with Google</button></div>
  )
  if (!role) return (
    <div className="center"><h1>No access yet</h1>
      <p className="mu">{user.email} isn’t on the family access list. Ask an admin to add you.</p>
      <button className="btn s" onClick={() => signOut(auth)}>Sign out</button></div>
  )

  const liveList = Object.values(members).filter((m) => !m.deleted)
  const removed = Object.values(members).length - liveList.length
  return (
    <>
      <header>
        <h1>🌳 Family Tree</h1>
        <button className="ib" aria-label="Dates" onClick={() => setSheet({ type: 'dates' })}>📅</button>
        {admin && <button className="ib" aria-label="Add member" onClick={() => setSheet({ type: 'add' })}>＋</button>}
        <button className="ib" aria-label="Removed members" onClick={() => setSheet({ type: 'del' })}>🗑 {removed || ''}</button>
        <select value={root || ''} onChange={(e) => setRoot(e.target.value)} aria-label="Root member">
          {liveList.map((m) => <option key={m.id} value={m.id}>{m.first_name}</option>)}
        </select>
        <div className="seg">
          <button className={mode === 'down' ? 'on' : ''} onClick={() => setMode('down')}>Descendants</button>
          <button className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Ancestors</button>
        </div>
        <button className="ib" aria-label="Sign out" title={user.email} onClick={() => signOut(auth)}>⎋</button>
      </header>
      <main>
        {liveList.length === 0 ? (
          <div className="center">
            <p className="mu">The tree is empty.</p>
            {admin ? <><button className="btn" onClick={() => setSheet({ type: 'add' })}>Add first member</button>
              <button className="btn s" onClick={seedSample}>Load sample family</button></> : <p className="mu">An admin needs to add the first member.</p>}
          </div>
        ) : (
          <Tree {...{ members, unions, root, mode, collapsed }} onSelect={(id) => setSheet({ type: 'info', id })} onToggle={toggle} />
        )}
      </main>
      {sheet?.type === 'info' && members[sheet.id] && <InfoSheet key={sheet.id} id={sheet.id} store={store} admin={admin} onClose={close} />}
      {sheet?.type === 'add' && <AddSheet store={store} onClose={close} />}
      {sheet?.type === 'dates' && <DatesSheet members={members} unions={unions} onClose={close} />}
      {sheet?.type === 'del' && <DeletedSheet members={members} admin={admin} onClose={close} />}
    </>
  )
}
