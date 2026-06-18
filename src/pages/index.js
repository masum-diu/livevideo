import { useState } from 'react'
import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import { getVideoDBConnection } from '@/lib/videodb'
import { findActiveUnlock } from '@/lib/unlocks'

const FREE_COUNT = 1
const PAYMENT_NUMBER = '01623325407'
const PRICE = 20

export async function getServerSideProps({ req }) {
  const phone = req.cookies?.lv_phone || null
  const unlock = findActiveUnlock(phone)

  let videos = []
  let error = null
  try {
    const conn = getVideoDBConnection()
    const coll = await conn.getCollection()
    const fetched = await coll.getVideos()
    videos = fetched.map((v) => ({
      id: v.id,
      title: v.name || v.id,
      playerUrl: v.playerUrl,
      thumbnail: v.thumbnail || null,
    }))
  } catch (err) {
    console.error('Failed to load videos from VideoDB:', err.message)
    error = err.message
  }

  return {
    props: { videos, error, isUnlocked: !!unlock, expiresAt: unlock?.expiresAt || null },
  }
}

export default function Home({ videos: initialVideos, error, isUnlocked, expiresAt }) {
  const [videos] = useState(initialVideos)
  const [current, setCurrent] = useState(initialVideos[0] || null)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState(null)
  const [showPopup, setShowPopup] = useState(false)

  function isLocked(index) {
    return !isUnlocked && index >= FREE_COUNT
  }

  function handleSelect(video, index) {
    if (isLocked(index)) { setShowPopup(true); return }
    setShowPopup(false)
    setCurrent(video)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleUnlock(e) {
    e.preventDefault()
    const formData = new FormData(e.target)
    const phone = formData.get('phone')?.trim()
    const txid = formData.get('txid')?.trim()
    setUnlocking(true); setUnlockError(null)
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, txid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'আনলক ব্যর্থ হয়েছে')
      setShowPopup(false)
      alert('✅ ' + data.message)
    } catch (err) { setUnlockError(err.message) }
    finally { setUnlocking(false) }
  }

  const VideoCard = ({ video, index, cardStyle, thumbStyle }) => {
    const locked = isLocked(index)
    return (
      <button
        className={`${cardStyle} ${current?.id === video.id ? styles.active : ''}`}
        onClick={() => handleSelect(video, index)}
      >
        <div className={thumbStyle}>
          {video.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.thumbnail} alt={video.title} className={styles.thumbnail} />
          ) : (
            <div className={styles.noThumb}>▶</div>
          )}
          {locked && (
            <div className={styles.lockOverlay}>
              <span className={styles.lockIcon}>🔒</span>
              <span className={styles.lockLabel}>PREMIUM</span>
            </div>
          )}
        </div>
        <div className={styles.cardBody}>
          <p className={styles.cardTitle}>{video.title}</p>
          <span className={`${styles.cardTag} ${!locked ? styles.cardTagFree : ''}`}>
            {locked ? '🔒 প্রিমিয়াম' : '✓ ফ্রি'}
          </span>
        </div>
      </button>
    )
  }

  return (
    <>
      <Head>
        <title>LiveVideo</title>
        <meta name="description" content="Video streaming site" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.page}>
        {/* Navbar */}
        <nav className={styles.navbar}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>▶</div>
            LiveVideo
          </div>
        </nav>

        <div className={styles.container}>
          {isUnlocked && (
            <p className={styles.statusActive}>
              ✅ অ্যাক্সেস সক্রিয় — মেয়াদ: {new Date(expiresAt).toLocaleDateString('bn-BD')}
            </p>
          )}

          {/* Watch Layout */}
          <div className={styles.watchLayout}>
            {/* Player */}
            <div className={styles.mainCol}>
              {current ? (
                <div className={styles.playerCard}>
                  <div className={styles.videoWrap}>
                    <iframe
                      key={current.id}
                      src={current.playerUrl}
                      className={styles.video}
                      allow="encrypted-media; autoplay; fullscreen"
                      allowFullScreen
                      scrolling="no"
                    />
                  </div>
                  <div className={styles.playerInfo}>
                    <p className={styles.nowPlaying}>{current.title}</p>
                    <span className={styles.nowPlayingBadge}>এখন চলছে</span>
                  </div>
                </div>
              ) : (
                <p className={styles.empty}>
                  কোনো ভিডিও পাওয়া যায়নি। {error ? `(${error})` : ''}
                </p>
              )}
            </div>

            {/* Sidebar */}
            {videos.length > 0 && (
              <aside className={styles.sidebar} style={{ position: 'sticky', top: '80px', maxHeight: 'calc(100vh - 100px)' }}>
                <div className={styles.sidebarHeader}>
                  <p className={styles.sectionTitle}>সব ভিডিও · {videos.length}টি</p>
                </div>
                <div className={styles.sideList}>
                  {videos.map((video, index) => {
                    const locked = isLocked(index)
                    return (
                      <button
                        key={video.id}
                        className={`${styles.sideItem} ${current?.id === video.id ? styles.active : ''} ${locked ? styles.locked : ''}`}
                        onClick={() => handleSelect(video, index)}
                      >
                        <div className={styles.sideThumbnailWrap}>
                          {video.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={video.thumbnail} alt={video.title} className={styles.thumbnail} />
                          ) : (
                            <div className={styles.noThumb}>▶</div>
                          )}
                          {locked && (
                            <div className={styles.lockOverlay}>
                              <span style={{ fontSize: '1rem' }}>🔒</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.sideItemInfo}>
                          <p className={styles.sideTitle}>{video.title}</p>
                          {locked && <span className={styles.sideLockTag}>🔒 প্রিমিয়াম</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </aside>
            )}
          </div>

          {/* Bottom Grid — mobile only */}
          {videos.length > 0 && (
            <div className={styles.bottomSection}>
              <div className={styles.gridHeader}>
                <p className={styles.gridTitle}>সব ভিডিও</p>
                <div className={styles.gridDivider} />
              </div>
              <div className={styles.grid}>
                {videos.map((video, index) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    index={index}
                    cardStyle={styles.card}
                    thumbStyle={styles.thumbnailWrap}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Unlock Popup */}
          {showPopup && (
            <div className={styles.overlay} onClick={() => setShowPopup(false)}>
              <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
                <div className={styles.popupBanner}>
                  <div className={styles.popupBannerAccent} />
                  <button className={styles.popupClose} onClick={() => setShowPopup(false)}>✕</button>
                  <div className={styles.popupLockCircle}>🔒</div>
                  <p className={styles.popupTitle}>প্রিমিয়াম কনটেন্ট</p>
                  <p className={styles.popupSubtitle}>এই ভিডিওটি দেখতে আনলক করুন</p>
                </div>
                <div className={styles.popupBody}>
                  <div className={styles.paymentCard}>
                    <div className={styles.paymentCardLeft}>
                      <span className={styles.paymentMethod}>bKash · Nagad · Rocket</span>
                      <span className={styles.paymentNumber}>{PAYMENT_NUMBER}</span>
                    </div>
                    <span className={styles.paymentAmount}>{PRICE}৳</span>
                  </div>
                  <p className={styles.popupHint}>
                    Send Money করুন, তারপর নিচে নম্বর ও Transaction ID দিন।<br />
                    ৩০ দিনের জন্য সব ভিডিও আনলক হয়ে যাবে।
                  </p>
                  <div className={styles.divider} />
                  <form className={styles.form} onSubmit={handleUnlock}>
                    <input type="text" name="phone" placeholder="যে নম্বর থেকে পাঠিয়েছেন" className={styles.input} required />
                    <input type="text" name="txid" placeholder="Transaction ID" className={styles.input} required />
                    <button type="submit" className={styles.btn} disabled={unlocking}>
                      {unlocking ? 'যাচাই হচ্ছে...' : 'আনলক করুন →'}
                    </button>
                    {unlockError && <p className={styles.error}>{unlockError}</p>}
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
