import { useState, useEffect } from 'react'
import Head from 'next/head'

export async function getServerSideProps({ req }) {
  const isLoggedIn = req.cookies?.lv_admin === '1'
  return { props: { isLoggedIn } }
}

export default function Admin({ isLoggedIn: initialLogin }) {
  const [loggedIn, setLoggedIn] = useState(initialLogin)
  const [loginError, setLoginError] = useState('')
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [tab, setTab] = useState('payments')

  async function handleLogin(e) {
    e.preventDefault()
    const { email, password } = Object.fromEntries(new FormData(e.target))
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) { setLoggedIn(true); loadPending() }
    else { const d = await res.json(); setLoginError(d.error) }
  }

  async function loadPending() {
    setLoading(true)
    const res = await fetch('/api/admin/pending')
    if (res.ok) setPending(await res.json())
    setLoading(false)
  }

  async function handleAction(phone, action) {
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, action }),
    })
    if (res.ok) loadPending()
  }

  async function handleUpload(e) {
    e.preventDefault()
    const formData = new FormData(e.target)
    if (!formData.get('video')?.size) { setUploadMsg('ভিডিও ফাইল বেছে নিন'); return }
    setUploading(true); setUploadMsg('')
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setUploadMsg(res.ok ? `✅ "${data.title}" আপলোড হয়েছে!` : `❌ ${data.error}`)
    if (res.ok) e.target.reset()
    setUploading(false)
  }

  useEffect(() => { if (loggedIn) loadPending() }, [loggedIn])

  if (!loggedIn) return (
    <>
      <Head><title>Admin Login</title></Head>
      <div style={s.page}>
        <div style={s.loginCard}>
          <div style={s.loginIcon}>🔐</div>
          <h1 style={s.loginTitle}>Admin Panel</h1>
          <p style={s.loginSub}>LiveVideo Dashboard</p>
          <form onSubmit={handleLogin} style={s.form}>
            <input name="email" type="email" placeholder="Email" style={s.input} required />
            <input name="password" type="password" placeholder="Password" style={s.input} required />
            {loginError && <p style={s.error}>{loginError}</p>}
            <button type="submit" style={s.btn}>লগইন করুন →</button>
          </form>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Head><title>Admin Dashboard</title></Head>
      <div style={s.dashPage}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <div style={s.sidebarLogo}>
            <span style={s.logoIcon}>▶</span> LiveVideo
          </div>
          <nav style={s.nav}>
            {[
              { key: 'payments', label: '💳 পেমেন্ট', badge: pending.length },
              { key: 'upload', label: '📤 আপলোড' },
            ].map(({ key, label, badge }) => (
              <button
                key={key}
                style={{ ...s.navBtn, ...(tab === key ? s.navBtnActive : {}) }}
                onClick={() => setTab(key)}
              >
                {label}
                {badge > 0 && <span style={s.badge}>{badge}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main style={s.main}>
          {tab === 'payments' && (
            <>
              <div style={s.pageHeader}>
                <h2 style={s.pageTitle}>পেমেন্ট অনুরোধ</h2>
                <button onClick={loadPending} style={s.refreshBtn}>↻ রিফ্রেশ</button>
              </div>

              {loading ? (
                <p style={s.hint}>লোড হচ্ছে...</p>
              ) : pending.length === 0 ? (
                <div style={s.emptyBox}>
                  <span style={{ fontSize: '2.5rem' }}>🎉</span>
                  <p style={s.hint}>কোনো pending রিকোয়েস্ট নেই</p>
                </div>
              ) : (
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {['মোবাইল নম্বর', 'Transaction ID', 'সময়', 'অ্যাকশন'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((p) => (
                        <tr key={p.phone} style={s.tr}>
                          <td style={s.td}>
                            <span style={s.phone}>{p.phone}</span>
                          </td>
                          <td style={s.td}>
                            <code style={s.txid}>{p.txid}</code>
                          </td>
                          <td style={s.td}>
                            <span style={s.time}>
                              {new Date(p.submittedAt).toLocaleString('bn-BD')}
                            </span>
                          </td>
                          <td style={s.td}>
                            <div style={s.actions}>
                              <button style={s.approveBtn} onClick={() => handleAction(p.phone, 'approve')}>
                                ✓ অ্যাপ্রুভ
                              </button>
                              <button style={s.rejectBtn} onClick={() => handleAction(p.phone, 'reject')}>
                                ✕ রিজেক্ট
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'upload' && (
            <>
              <div style={s.pageHeader}>
                <h2 style={s.pageTitle}>ভিডিও আপলোড</h2>
              </div>
              <div style={s.uploadCard}>
                <form onSubmit={handleUpload} style={s.form}>
                  <input type="text" name="name" placeholder="ভিডিওর নাম (ঐচ্ছিক)" style={s.input} />
                  <input type="file" name="video" accept="video/*" required style={s.fileInput} />
                  <button type="submit" style={s.btn} disabled={uploading}>
                    {uploading ? 'আপলোড হচ্ছে...' : '📤 আপলোড করুন'}
                  </button>
                  {uploadMsg && <p style={uploadMsg.startsWith('✅') ? s.success : s.error}>{uploadMsg}</p>}
                </form>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}

const s = {
  /* Login */
  page: { minHeight: '100vh', background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' },
  loginCard: { background: '#fff', borderRadius: 20, padding: '2.5rem 2rem', width: '100%', maxWidth: 380, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', textAlign: 'center' },
  loginIcon: { fontSize: '2.5rem', marginBottom: '0.75rem' },
  loginTitle: { fontSize: '1.4rem', fontWeight: 800, color: '#0f0f0f', letterSpacing: '-0.4px', margin: 0 },
  loginSub: { fontSize: '0.85rem', color: '#999', marginTop: '0.25rem', marginBottom: '1.75rem' },

  /* Dashboard */
  dashPage: { display: 'flex', minHeight: '100vh', background: '#f7f7f8', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: 220, background: '#fff', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '1.1rem', color: '#0f0f0f', marginBottom: '2rem', paddingLeft: '0.5rem' },
  logoIcon: { background: 'linear-gradient(135deg,#ff0000,#cc0000)', color: '#fff', width: 28, height: 28, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' },
  nav: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  navBtn: { background: 'transparent', border: 'none', padding: '0.65rem 0.85rem', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontSize: '0.88rem', fontWeight: 600, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif' },
  navBtnActive: { background: '#f5f5f5', color: '#0f0f0f' },
  badge: { background: '#ff0000', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 100, minWidth: 20, textAlign: 'center' },

  main: { flex: 1, padding: '2rem 2.5rem', overflowY: 'auto' },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  pageTitle: { fontSize: '1.2rem', fontWeight: 800, color: '#0f0f0f', letterSpacing: '-0.3px', margin: 0 },
  refreshBtn: { background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#555' },

  emptyBox: { textAlign: 'center', padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
  hint: { color: '#aaa', fontSize: '0.9rem' },

  tableWrap: { background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f5f5f5', background: '#fafafa' },
  tr: { borderBottom: '1px solid #f9f9f9' },
  td: { padding: '1rem 1.25rem', verticalAlign: 'middle' },
  phone: { fontWeight: 700, color: '#0f0f0f', fontSize: '0.9rem' },
  txid: { background: '#f5f5f5', padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.82rem', color: '#444', fontFamily: 'monospace' },
  time: { fontSize: '0.8rem', color: '#999' },
  actions: { display: 'flex', gap: '0.5rem' },
  approveBtn: { background: '#f0fdf6', border: '1.5px solid #bbf7d0', color: '#16a34a', borderRadius: 8, padding: '0.4rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' },
  rejectBtn: { background: '#fff5f5', border: '1.5px solid #fecaca', color: '#e53935', borderRadius: 8, padding: '0.4rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' },

  uploadCard: { background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 480, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' },
  fileInput: { fontSize: '0.88rem', color: '#555' },

  /* Shared */
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: { padding: '0.8rem 1rem', borderRadius: 10, border: '1.5px solid #eee', background: '#fafafa', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif' },
  btn: { padding: '0.85rem', borderRadius: 12, border: 'none', background: '#0f0f0f', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  error: { color: '#e53935', fontSize: '0.85rem', fontWeight: 500, background: '#fff5f5', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #fecaca' },
  success: { color: '#16a34a', fontSize: '0.85rem', fontWeight: 500, background: '#f0fdf6', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #bbf7d0' },
}
