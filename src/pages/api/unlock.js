import { addPending, isTxidUsed } from '@/lib/unlocks'

const PHONE_RE = /^01[3-9]\d{8}$/
const TXID_RE = /^[A-Za-z0-9]{6,30}$/

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { phone, txid } = req.body || {}

  if (!PHONE_RE.test(phone || ''))
    return res.status(400).json({ error: 'সঠিক বাংলাদেশী মোবাইল নম্বর দিন' })

  if (!TXID_RE.test(txid || ''))
    return res.status(400).json({ error: 'সঠিক Transaction ID দিন' })

  if (isTxidUsed(txid))
    return res.status(400).json({ error: 'এই Transaction ID আগে ব্যবহার হয়ে গেছে' })

  addPending(phone, txid)
  return res.status(200).json({ message: 'আপনার পেমেন্ট রিকোয়েস্ট পাঠানো হয়েছে। অ্যাডমিন অ্যাপ্রুভ করলে অ্যাক্সেস পাবেন।' })
}
