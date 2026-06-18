import { approveUnlock, rejectUnlock } from '@/lib/unlocks'

export default async function handler(req, res) {
  if (req.cookies?.lv_admin !== '1') return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'POST') return res.status(405).end()

  const { phone, action } = req.body || {}
  if (!phone) return res.status(400).json({ error: 'phone required' })

  if (action === 'approve') {
    const record = await approveUnlock(phone)
    if (!record) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json({ ok: true, record })
  }

  if (action === 'reject') {
    await rejectUnlock(phone)
    return res.status(200).json({ ok: true })
  }

  return res.status(400).json({ error: 'Invalid action' })
}
