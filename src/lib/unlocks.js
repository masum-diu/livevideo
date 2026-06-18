import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const THIRTY_DAYS = 30 * 24 * 60 * 60

export async function findActiveUnlock(phone) {
  if (!phone) return null
  const record = await redis.get(`unlock:${phone}`)
  return record || null
}

export async function isTxidUsed(txid) {
  const used = await redis.get(`txid:${txid}`)
  return !!used
}

export async function addPending(phone, txid) {
  const record = { phone, txid, submittedAt: new Date().toISOString(), status: 'pending' }
  await redis.set(`pending:${phone}`, record)
  await redis.set(`txid:${txid}`, '1')
  return record
}

export async function getPending() {
  const keys = await redis.keys('pending:*')
  if (!keys.length) return []
  const records = await Promise.all(keys.map((k) => redis.get(k)))
  return records.filter((r) => r?.status === 'pending')
}

export async function approveUnlock(phone) {
  const pending = await redis.get(`pending:${phone}`)
  if (!pending) return null

  await redis.del(`pending:${phone}`)

  const record = {
    phone,
    txid: pending.txid,
    unlockedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + THIRTY_DAYS * 1000).toISOString(),
  }
  await redis.set(`unlock:${phone}`, record, { ex: THIRTY_DAYS })
  return record
}

export async function rejectUnlock(phone) {
  const pending = await redis.get(`pending:${phone}`)
  if (!pending) return false
  await redis.del(`pending:${phone}`)
  await redis.del(`txid:${pending.txid}`)
  return true
}
