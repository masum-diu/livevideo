export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body || {}

  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASS)
    return res.status(401).json({ error: 'ইমেইল বা পাসওয়ার্ড ভুল' })

  res.setHeader('Set-Cookie', `lv_admin=1; Path=/; Max-Age=${8 * 60 * 60}; HttpOnly; SameSite=Lax`)
  return res.status(200).json({ ok: true })
}
