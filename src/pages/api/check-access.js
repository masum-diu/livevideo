import { findActiveUnlock } from '@/lib/unlocks'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { phone } = req.body || {}
  if (!phone) return res.status(400).json({ error: 'নম্বর দিন' })

  const unlock = await findActiveUnlock(phone)
  if (!unlock) return res.status(403).json({ error: 'এখনো অ্যাপ্রুভ হয়নি। একটু অপেক্ষা করুন।' })

  res.setHeader('Set-Cookie', `lv_phone=${phone}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax`)
  return res.status(200).json({ ok: true })
}
