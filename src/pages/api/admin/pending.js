import { getPending } from '@/lib/unlocks'

export default function handler(req, res) {
  if (req.cookies?.lv_admin !== '1') return res.status(401).json({ error: 'Unauthorized' })
  return res.status(200).json(getPending())
}
