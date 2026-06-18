import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const STORE_PATH = path.join(DATA_DIR, 'unlocks.json')
const PENDING_PATH = path.join(DATA_DIR, 'pending.json')
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return []
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function writeJSON(filePath, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

export function findActiveUnlock(phone) {
  if (!phone) return null
  const records = readJSON(STORE_PATH)
  const record = records.find((r) => r.phone === phone)
  if (!record) return null
  if (new Date(record.expiresAt).getTime() < Date.now()) return null
  return record
}

export function isTxidUsed(txid) {
  const unlocks = readJSON(STORE_PATH)
  const pending = readJSON(PENDING_PATH)
  return [...unlocks, ...pending].some((r) => r.txid === txid)
}

export function addPending(phone, txid) {
  const records = readJSON(PENDING_PATH)
  const existing = records.findIndex((r) => r.phone === phone)
  const record = { phone, txid, submittedAt: new Date().toISOString(), status: 'pending' }
  if (existing >= 0) records[existing] = record
  else records.push(record)
  writeJSON(PENDING_PATH, records)
  return record
}

export function getPending() {
  return readJSON(PENDING_PATH).filter((r) => r.status === 'pending')
}

export function approveUnlock(phone) {
  const pending = readJSON(PENDING_PATH)
  const idx = pending.findIndex((r) => r.phone === phone)
  if (idx === -1) return null

  pending[idx].status = 'approved'
  writeJSON(PENDING_PATH, pending)

  const unlocks = readJSON(STORE_PATH)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + THIRTY_DAYS_MS).toISOString()
  const record = { phone, txid: pending[idx].txid, unlockedAt: now.toISOString(), expiresAt }
  const existingIdx = unlocks.findIndex((r) => r.phone === phone)
  if (existingIdx >= 0) unlocks[existingIdx] = record
  else unlocks.push(record)
  writeJSON(STORE_PATH, unlocks)
  return record
}

export function rejectUnlock(phone) {
  const pending = readJSON(PENDING_PATH)
  const idx = pending.findIndex((r) => r.phone === phone)
  if (idx === -1) return false
  pending[idx].status = 'rejected'
  writeJSON(PENDING_PATH, pending)
  return true
}
