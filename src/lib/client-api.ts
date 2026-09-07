// Helper fetch dengan token autentikasi admin
export function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('absensi_token') : null
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return fetch(url, { ...init, headers })
}

export interface Perangkat {
  id: number
  nipd: string
  nama: string
  nik: string | null
  kecamatan: string
  desa: string
  ttl: string | null
  jenisKelamin: string
  pendidikan: string | null
  nomorSk: string | null
  jabatan: string
  status: 'AKTIF' | 'PASIF'
  keterangan: string | null
  createdAt: string
  absensi: AbsensiRecord[]
}

export interface AbsensiRecord {
  id: number
  perangkatId: number
  tanggal: string
  jamDatang: string | null
  jamPulang: string | null
  kategori: string
  metode: string
  latitude: number | null
  longitude: number | null
  akurasi: number | null
  latPulang: number | null
  lonPulang: number | null
  akurasiPulang: number | null
  createdAt: string
  updatedAt: string
  perangkat?: Perangkat
}

export interface ScanResponse {
  success: boolean
  tipe?:
    | 'DATANG'
    | 'PULANG'
    | 'SUDAH_DATANG'
    | 'DUPLIKAT'
    | 'SUDAH_LENGKAP'
    | 'TIDAK_DIKENAL'
    | 'BELUM_DATANG'
  message: string
  data?: AbsensiRecord
}

// Nada beep saat scan
export function beepSukses() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
    setTimeout(() => ctx.close(), 600)
  } catch {
    // abaikan jika browser tidak mendukung
  }
}

export function beepGagal() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.value = 220
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    setTimeout(() => ctx.close(), 800)
  } catch {
    // abaikan
  }
}
