import fs from 'fs'
import formidable from 'formidable'
import { getVideoDBConnection } from '@/lib/videodb'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const form = formidable({ maxFileSize: 2 * 1024 * 1024 * 1024 })

  let fields, files
  try {
    ;[fields, files] = await form.parse(req)
  } catch (err) {
    return res.status(400).json({ error: 'ফাইল পার্স করা যায়নি: ' + err.message })
  }

  const file = files.video?.[0]
  if (!file) {
    return res.status(400).json({ error: 'কোনো ভিডিও ফাইল পাওয়া যায়নি' })
  }

  try {
    const conn = getVideoDBConnection()
    const coll = await conn.getCollection()
    const name = fields.name?.[0]?.trim() || file.originalFilename

    const video = await coll.uploadFile({
      filePath: file.filepath,
      name,
    })

    return res.status(200).json({
      id: video.id,
      title: video.name,
      playerUrl: video.playerUrl,
      thumbnail: video.thumbnail || null,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  } finally {
    fs.unlink(file.filepath, () => {})
  }
}
