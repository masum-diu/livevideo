import { useState, useEffect } from 'react'
import Head from 'next/head'
import s from '@/styles/Admin.module.css'

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
    if (res.ok) { setLoggedIn(true) }
    else { const d = await res.json(); setLoginError(d.error) }
  }

  async function loadPending() {
    setLoading(true)
    const res = await fetch('/api/admin/pending')
    if (res.ok) setPending(await res.json())
    setLoading(false)
  }

  async function handleAction(phone, action) {
    await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, action }),
    })
    loadPending()
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

  const tabs = [
    { key: 'payments', icon: '💳', label: 'পেমেন্ট', badge: pending.length },
    { key: 'upload', icon: '📤', label: 'আপলোড' },
  ]

  if (!loggedIn) return (
    <>
      <Head><title>Admin Login</title></Head>
      <div className={s.loginPage}>
        <div className={s.loginCard}>
          <div className={s.loginIcon}>🔐</div>
          <h1 className={s.loginTitle}>Admin Panel</h1>
          <p className={s.loginSub}>LiveVideo Dashboard</p>
          <form onSubmit={handleLogin} className={s.form}>
            <input name="email" type="email" placeholder="Email" className={s.input} required />
            <input name="password" type="password" placeholder="Password" className={s.input} required />
            {loginError && <p className={s.error}>{loginError}</p>}
            <button type="submit" className={s.btn}>লগইন করুন →</button>
          </form>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Head><title>Admin Dashboard</title></Head>
      <div className={s.dashPage}>

        {/* Mobile topbar */}
        <header className={s.topbar}>
          <div className={s.topbarLogo}>
            <span className={s.logoIcon}>▶</span> LiveVideo Admin
          </div>
          <button className={s.refreshBtn} onClick={loadPending}>↻</button>
        </header>

        <div className={s.desktopLayout}>
          {/* Desktop sidebar */}
          <aside className={s.sidebar}>
            <div className={s.sidebarLogo}>
              <span className={s.logoIcon}>▶</span> LiveVideo
            </div>
            <nav className={s.nav}>
              {tabs.map(({ key, icon, label, badge }) => (
                <button
                  key={key}
                  className={`${s.navBtn} ${tab === key ? s.navBtnActive : ''}`}
                  onClick={() => setTab(key)}
                >
                  {icon} {label}
                  {badge > 0 && <span className={s.badge}>{badge}</span>}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className={s.main}>
            {/* Payments tab */}
            {tab === 'payments' && (
              <>
                <div className={s.pageHeader}>
                  <h2 className={s.pageTitle}>পেমেন্ট অনুরোধ</h2>
                  <button onClick={loadPending} className={s.refreshBtn}>↻ রিফ্রেশ</button>
                </div>

                {loading ? (
                  <p className={s.hint}>লোড হচ্ছে...</p>
                ) : pending.length === 0 ? (
                  <div className={s.emptyBox}>
                    <span style={{ fontSize: '2.5rem' }}>🎉</span>
                    <p className={s.hint}>কোনো pending রিকোয়েস্ট নেই</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className={s.tableWrap}>
                      <table className={s.table}>
                        <thead>
                          <tr>
                            {['মোবাইল নম্বর', 'Transaction ID', 'সময়', 'অ্যাকশন'].map(h => (
                              <th key={h} className={s.th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pending.map((p) => (
                            <tr key={p.phone} className={s.tr}>
                              <td className={s.td}><span className={s.phoneText}>{p.phone}</span></td>
                              <td className={s.td}><code className={s.txidText}>{p.txid}</code></td>
                              <td className={s.td}><span className={s.timeText}>{new Date(p.submittedAt).toLocaleString('bn-BD')}</span></td>
                              <td className={s.td}>
                                <div className={s.actions}>
                                  <button className={s.approveBtn} onClick={() => handleAction(p.phone, 'approve')}>✓ অ্যাপ্রুভ</button>
                                  <button className={s.rejectBtn} onClick={() => handleAction(p.phone, 'reject')}>✕ রিজেক্ট</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className={s.cardList}>
                      {pending.map((p) => (
                        <div key={p.phone} className={s.payCard}>
                          <div className={s.payCardTop}>
                            <span className={s.payCardPhone}>{p.phone}</span>
                            <span className={s.payCardTime}>{new Date(p.submittedAt).toLocaleDateString('bn-BD')}</span>
                          </div>
                          <code className={s.payCardTxid}>{p.txid}</code>
                          <div className={s.payCardActions}>
                            <button className={s.approveBtn} onClick={() => handleAction(p.phone, 'approve')}>✓ অ্যাপ্রুভ</button>
                            <button className={s.rejectBtn} onClick={() => handleAction(p.phone, 'reject')}>✕ রিজেক্ট</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Upload tab */}
            {tab === 'upload' && (
              <>
                <div className={s.pageHeader}>
                  <h2 className={s.pageTitle}>ভিডিও আপলোড</h2>
                </div>
                <div className={s.uploadCard}>
                  <form onSubmit={handleUpload} className={s.form}>
                    <input type="text" name="name" placeholder="ভিডিওর নাম (ঐচ্ছিক)" className={s.input} />
                    <input type="file" name="video" accept="video/*" required className={s.fileInput} />
                    <button type="submit" className={s.btn} disabled={uploading}>
                      {uploading ? 'আপলোড হচ্ছে...' : '📤 আপলোড করুন'}
                    </button>
                    {uploadMsg && <p className={uploadMsg.startsWith('✅') ? s.success : s.error}>{uploadMsg}</p>}
                  </form>
                </div>
              </>
            )}
          </main>
        </div>

        {/* Mobile bottom tab bar */}
        <nav className={s.tabBar}>
          <div className={s.tabBarInner}>
            {tabs.map(({ key, icon, label, badge }) => (
              <button
                key={key}
                className={`${s.tabBarBtn} ${tab === key ? s.tabBarBtnActive : ''}`}
                onClick={() => setTab(key)}
              >
                {badge > 0 && <span className={s.tabBadge}>{badge}</span>}
                <span className={s.tabBarIcon}>{icon}</span>
                <span className={s.tabBarLabel}>{label}</span>
              </button>
            ))}
          </div>
        </nav>

      </div>
    </>
  )
}
