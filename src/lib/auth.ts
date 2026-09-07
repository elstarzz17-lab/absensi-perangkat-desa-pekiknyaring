import crypto from 'crypto'

// Ganti lewat env AUTH_SECRET pada .env / server produksi (wajib untuk deploy publik)
const SECRET =
  process.env.AUTH_SECRET || 'desa-pekik-nyaring-absensi-secret-2026'

export function createToken(username: string): string {
  const payload = `${username}.${Date.now()}`
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export function verifyToken(token: string | null): string | null {
  if (!token) return null
  try {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return null
    const payload = Buffer.from(payloadB64, 'base64url').toString()
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    if (sig.length !== expected.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    const [username, ts] = payload.split('.')
    // Token berlaku 30 hari
    if (Date.now() - Number(ts) > 30 * 24 * 60 * 60 * 1000) return null
    return username
  } catch {
    return null
  }
}

export function getAuthUser(req: Request): string | null {
  const header = req.headers.get('authorization')
  if (!header || !header.startsWith('Bearer ')) return null
  return verifyToken(header.slice(7))
}
