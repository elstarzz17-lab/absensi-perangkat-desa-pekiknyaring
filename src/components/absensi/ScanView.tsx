'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { authFetch, beepSukses, beepGagal, type ScanResponse, type AbsensiRecord } from '@/lib/client-api'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ScanLine, Camera, CameraOff, Keyboard, LoaderCircle, CheckCircle2, XCircle,
  Info, AlertTriangle, RefreshCw, LogIn, LogOut, Clock, User, SwitchCamera, ExternalLink, FileImage,
  MapPin, Navigation,
} from 'lucide-react'

interface ScanViewProps {
  refreshToken: number
}

interface KameraInfo {
  id: string
  label: string
}

interface LokasiGps {
  latitude: number
  longitude: number
  akurasi: number | null
}

type GpsStatus = 'MENGAMBIL' | 'AKTIF' | 'TIDAK_AKTIF' | 'TIDAK_TERSEDIA'

/**
 * Ambil posisi GPS saat ini dengan batas waktu. Mengembalikan null bila
 * izin ditolak / perangkat tanpa GPS / terlalu lama — absensi tetap jalan
 * tanpa lokasi, jadi tidak pernah memblokir proses absen.
 */
function ambilLokasiSekarang(batasMs = 5000): Promise<LokasiGps | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    let selesai = false
    const akhiri = (hasil: LokasiGps | null) => {
      if (selesai) return
      selesai = true
      clearTimeout(timer)
      resolve(hasil)
    }
    const timer = setTimeout(() => akhiri(null), batasMs)
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        akhiri({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          akurasi: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        }),
      () => akhiri(null),
      { enableHighAccuracy: true, timeout: batasMs - 500, maximumAge: 20000 }
    )
  })
}

/** Apakah halaman berjalan di dalam iframe (mis. pratinjau tersemat)? */
function dalamIframe(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

/**
 * Ubah error kamera menjadi pesan yang spesifik & bisa ditindaklanjuti,
 * bukan pesan generik yang membingungkan.
 */
function pesanErrorKamera(e: unknown): string {
  // Bentuk error bervariasi: DOMException asli, Error bungkus html5-qrcode
  // (nama error asli hanya tertanam di dalam teks pesan), bahkan string mentah.
  // String(e) menjamin semua bentuk tetap terbaca.
  const gabungan = [
    String(e ?? ''),
    (e as { name?: string })?.name ?? '',
    (e as { message?: string })?.message ?? '',
  ].join(' ')
  const saranIframe = dalamIframe()
    ? ' Catatan: situs dibuka dalam mode pratinjau tersemat — buka di tab/jendela baru agar izin kamera dapat diberikan.'
    : ''
  // Pemeriksaan pakai regex terhadap gabungan nama+pesan agar wrapper html5-qrcode tetap dikenali
  if (/NotAllowedError|PermissionDeniedError|permission/i.test(gabungan)) {
    return (
      'Izin kamera DITOLAK browser. Klik ikon kamera/gembok di address bar, pilih "Izinkan", lalu muat ulang halaman.' +
      saranIframe
    )
  }
  if (/NotFoundError|DevicesNotFoundError|device not found|no camera/i.test(gabungan)) {
    return (
      'Kamera tidak ditemukan pada perangkat ini. Pastikan perangkat memiliki kamera yang terpasang & tidak dimatikan sistem, ' +
      'atau gunakan Input Manual di bawah untuk absen tanpa kamera.'
    )
  }
  if (/NotReadableError|TrackStartError|could not start video/i.test(gabungan)) {
    return (
      'Kamera tidak dapat dibaca karena sedang dipakai aplikasi lain. Tutup aplikasi yang menggunakan kamera ' +
      '(Zoom, Google Meet, WhatsApp Web, dll.) lalu coba lagi.'
    )
  }
  if (/OverconstrainedError|overconstrained/i.test(gabungan)) {
    return 'Kamera tidak mendukung mode yang diminta. Coba pilih kamera lain pada daftar kamera di bawah.'
  }
  if (/SecurityError|insecure/i.test(gabungan)) {
    return 'Akses kamera diblokir karena konteks tidak aman. Buka situs melalui HTTPS atau localhost.' + saranIframe
  }
  return (
    `Kamera gagal diaktifkan (${gabungan.replace(/\s+/g, ' ').trim().slice(0, 120)}). ` +
    `Pastikan izin kamera diberikan dan perangkat memiliki kamera.${saranIframe}`
  )
}

/** Kunci localStorage untuk mengingat kamera terakhir yang dipilih operator */
const KUNCI_KAMERA = 'absensi-kamera-terpilih'

/**
 * Pra-minta izin kamera bawaan langsung dari klik pengguna:
 * memunculkan prompt izin browser secara jelas, dan setelah diizinkan
 * label kamera menjadi terbaca sehingga kamera terbaik bisa dipilih otomatis.
 */
async function mintaIzinKamera(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  // Langsung dilepas — hanya untuk memicu & memastikan izin, video dipegang
  // oleh html5-qrcode pada langkah berikutnya.
  for (const track of stream.getTracks()) track.stop()
}

/**
 * Jalankan operasi kamera sambil menekan console.error internal html5-qrcode
 * (mis. "Error getting userMedia ..."). Errornya memang sudah ditangani dan
 * diterjemahkan ke pesan yang jelas, jadi log mentahnya tidak perlu memunculkan
 * badge error pada overlay/dev tools.
 */
async function denganLogKameraDitekan<T>(operasi: () => Promise<T>): Promise<T> {
  const asli = console.error
  console.error = (...args: unknown[]) => {
    if (/userMedia/i.test(String(args[0] ?? ''))) return
    asli(...args)
  }
  try {
    return await operasi()
  } finally {
    console.error = asli
  }
}

const TIPE_STYLE: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  DATANG: {
    bg: 'bg-brand-green-50 border-brand-green-600',
    icon: <LogIn className="w-8 h-8 text-brand-green-600" />,
    label: 'ABSEN DATANG',
  },
  PULANG: {
    bg: 'bg-brand-gold-50 border-brand-gold-500',
    icon: <LogOut className="w-8 h-8 text-brand-gold-600" />,
    label: 'ABSEN PULANG',
  },
  SUDAH_DATANG: {
    bg: 'bg-brand-gold-50 border-brand-gold-400',
    icon: <Info className="w-8 h-8 text-brand-gold-600" />,
    label: 'SUDAH ABSEN DATANG',
  },
  DUPLIKAT: {
    bg: 'bg-brand-gold-50 border-brand-gold-400',
    icon: <AlertTriangle className="w-8 h-8 text-brand-gold-600" />,
    label: 'SCAN TERLALU CEPAT',
  },
  SUDAH_LENGKAP: {
    bg: 'bg-brand-green-50 border-brand-green-500',
    icon: <CheckCircle2 className="w-8 h-8 text-brand-green-700" />,
    label: 'ABSEN LENGKAP',
  },
  BELUM_DATANG: {
    bg: 'bg-red-50 border-red-400',
    icon: <AlertTriangle className="w-8 h-8 text-red-600" />,
    label: 'BELUM ABSEN DATANG',
  },
  TIDAK_DIKENAL: {
    bg: 'bg-red-50 border-red-400',
    icon: <XCircle className="w-8 h-8 text-red-600" />,
    label: 'TIDAK DIKENALI',
  },
}

export default function ScanView({ refreshToken }: ScanViewProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 })
  const processingRef = useRef(false)
  const [isScanning, setIsScanning] = useState(false)
  const [starting, setStarting] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasil, setHasil] = useState<ScanResponse | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [absensiHariIni, setAbsensiHariIni] = useState<AbsensiRecord[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [daftarKamera, setDaftarKamera] = useState<KameraInfo[]>([])
  const [kameraAktif, setKameraAktif] = useState('')
  const [gantiKameraLoading, setGantiKameraLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const fileScannerRef = useRef<Html5Qrcode | null>(null)
  const [gps, setGps] = useState<LokasiGps | null>(null)
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('MENGAMBIL')
  // Mode absen eksplisit: operator memilih DATANG atau PULANG sebelum memindai
  const [modeAbsen, setModeAbsen] = useState<'DATANG' | 'PULANG'>('DATANG')
  // Callback scan html5-qrcode menangkap closure saat start() — baca mode lewat
  // ref agar ganti mode saat kamera hidup langsung berefek tanpa harus
  // mematikan & menyalakan ulang kamera (bug: absen selalu tercatat DATANG).
  const modeAbsenRef = useRef(modeAbsen)
  useEffect(() => {
    modeAbsenRef.current = modeAbsen
  }, [modeAbsen])

  const muatAbsensiHariIni = useCallback(async () => {
    try {
      const res = await authFetch('/api/absensi')
      const json = await res.json()
      if (json.success) setAbsensiHariIni(json.data)
    } catch {
      // diamkan
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    muatAbsensiHariIni()
  }, [muatAbsensiHariIni, refreshToken])

  // Panaskan GPS saat halaman dibuka agar chip status & scan pertama cepat
  useEffect(() => {
    let batal = false
    ;(async () => {
      const r = await ambilLokasiSekarang(6000)
      if (batal) return
      if (r) {
        setGps(r)
        setGpsStatus('AKTIF')
      } else {
        setGpsStatus('TIDAK_AKTIF')
      }
    })()
    return () => {
      batal = true
    }
  }, [])

  const prosesScan = useCallback(
    async (code: string, metode: 'SCAN' | 'MANUAL') => {
      // Debounce: kode sama dalam 3 detik diabaikan
      const now = Date.now()
      if (code === lastScanRef.current.code && now - lastScanRef.current.time < 3000) return
      if (processingRef.current) return
      processingRef.current = true
      lastScanRef.current = { code, time: now }

      try {
        // Sertakan posisi GPS terkini (tidak memblokir lama — absen tetap
        // tercatat walau GPS lambat/ditolak)
        const lok = await ambilLokasiSekarang(3500)
        if (lok) {
          setGps(lok)
          setGpsStatus('AKTIF')
        }
        const res = await authFetch('/api/scan', {
          method: 'POST',
          body: JSON.stringify({ code, metode, tipe: modeAbsenRef.current, lokasi: lok }),
        })
        const json: ScanResponse = await res.json()
        setHasil(json)
        if (json.success && json.tipe && ['DATANG', 'PULANG'].includes(json.tipe)) {
          beepSukses()
        } else if (
          !json.success ||
          json.tipe === 'TIDAK_DIKENAL' ||
          json.tipe === 'BELUM_DATANG'
        ) {
          beepGagal()
        } else {
          beepSukses()
        }
        muatAbsensiHariIni()
      } catch {
        setHasil({ success: false, message: 'Gagal terhubung ke server' })
        beepGagal()
      } finally {
        setTimeout(() => {
          processingRef.current = false
        }, 800)
      }
    },
    [muatAbsensiHariIni]
  )

  const startCamera = useCallback(
    async (deviceId?: string) => {
      setCameraError(null)
      setStarting(true)
      let scanner: Html5Qrcode | null = null
      try {
        // Pra-cek: browser mendukung & konteks aman
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          const err = new Error('Browser tidak mendukung akses kamera (mediaDevices)')
          err.name = 'SecurityError'
          throw err
        }
        if (!window.isSecureContext) {
          const err = new Error('Koneksi tidak aman (bukan HTTPS/localhost)')
          err.name = 'SecurityError'
          throw err
        }

        // 1) Pra-minta izin kamera bawaan dari klik pengguna — prompt izin
        //    muncul jelas & label kamera jadi terbaca untuk pemilihan otomatis.
        if (!deviceId) await mintaIzinKamera()

        const konfig = { fps: 10, qrbox: { width: 230, height: 230 } }
        const saatTerbaca = (decodedText: string) => prosesScan(decodedText, 'SCAN')

        // 2) Tentukan kamera yang dipakai: pilihan pengguna > kamera tersimpan
        //    (yang masih terpasang) > kamera belakang (HP) > kamera pertama.
        let pilihan = deviceId
        const kamera = await denganLogKameraDitekan(() => Html5Qrcode.getCameras())
        if (kamera.length === 0) {
          const err = new Error('Tidak ada kamera yang terdeteksi pada perangkat ini')
          err.name = 'NotFoundError'
          throw err
        }
        const daftar = kamera.map((k, i) => ({ id: k.id, label: k.label || `Kamera ${i + 1}` }))
        setDaftarKamera(daftar)
        if (!pilihan) {
          try {
            const idTersimpan = localStorage.getItem(KUNCI_KAMERA)
            if (idTersimpan && daftar.some((k) => k.id === idTersimpan)) pilihan = idTersimpan
          } catch {
            // mode privat / penyimpanan diblokir — lanjut pilih otomatis
          }
        }
        if (!pilihan) {
          const belakang = daftar.find((k) =>
            /back|rear|belakang|environment|kamera belakang/i.test(k.label)
          )
          pilihan = (belakang ?? daftar[0]).id
        }

        // 3) Nyalakan dengan RANTAI CADANGAN: ID persis > ID longgar > kamera
        //    belakang (facingMode environment) > kamera bawaan. Bila pilihan
        //    utama gagal (kamera dipindai, perangkat berubah, atau ID basi),
        //    percobaan berikutnya otomatis dijalankan — kamera tetap menyala
        //    alih-alih menampilkan eror.
        //    PENTING: setiap percobaan memakai INSTANSI Html5Qrcode baru,
        //    karena instansi yang gagal start() terjebak pada state internal
        //    ("Cannot transition to a new state") dan tidak bisa dipakai ulang.
        const rantai: MediaTrackConstraints[] = [
          { deviceId: { exact: pilihan! } },
          { deviceId: pilihan! },
          { facingMode: 'environment' },
          { facingMode: 'user' },
        ]
        let terakhirError: unknown = null
        let menyala = false
        for (const coba of rantai) {
          try {
            scanner = new Html5Qrcode('qr-reader-region', { verbose: false })
            scannerRef.current = scanner
            await denganLogKameraDitekan(() =>
              scanner!.start(coba, konfig, saatTerbaca, () => {})
            )
            menyala = true
            break
          } catch (e) {
            terakhirError = e
            // Bersihkan sisa stream & DOM percobaan gagal agar percobaan
            // berikutnya mulai dari kondisi bersih
            try {
              await scanner!.stop()
            } catch {
              // scanner memang belum sempat menyala — aman diabaikan
            }
            try {
              scanner!.clear()
            } catch {
              // state internal mungkin macet — abaikan
            }
            try {
              const el = document.getElementById('qr-reader-region')
              if (el) el.innerHTML = ''
            } catch {
              // abaikan
            }
          }
        }
        if (!menyala || !scanner) {
          throw terakhirError ?? new Error('Kamera gagal diaktifkan')
        }

        setIsScanning(true)

        // 4) Selaraskan ID kamera yang BENAR-BENAR menyala (bisa berbeda dari
        //    pilihan bila rantai cadangan aktif), simpan & tampilkan di pemilih.
        let idMenyala = pilihan!
        try {
          const setelan = scanner.getRunningTrackSettings() as { deviceId?: string } | undefined
          if (setelan?.deviceId && daftar.some((k) => k.id === setelan.deviceId)) {
            idMenyala = setelan.deviceId
          }
        } catch {
          // tidak semua browser mengekspos setelan track — pakai pilihan saja
        }
        setKameraAktif(idMenyala)
        try {
          localStorage.setItem(KUNCI_KAMERA, idMenyala)
        } catch {
          // penyimpanan penuh / mode privat — abaikan
        }
      } catch (e) {
        // console.warn agar tidak memicu overlay error pada mode dev
        console.warn('Kamera gagal diaktifkan:', e)
        setCameraError(pesanErrorKamera(e))
        try {
          scanner?.clear()
        } catch {
          // abaikan — scanner memang belum sempat menyala
        }
        scannerRef.current = null
        setIsScanning(false)
      } finally {
        setStarting(false)
      }
    },
    [prosesScan]
  )

  /** Pindai QR dari file gambar (cadangan bila kamera tidak tersedia/diblokir). */
  async function handleFileGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset input agar file yang sama tetap bisa dipilih ulang
    e.target.value = ''
    if (!file) return
    setFileLoading(true)
    setCameraError(null)
    try {
      if (!fileScannerRef.current) {
        fileScannerRef.current = new Html5Qrcode('qr-file-region', { verbose: false })
      }
      const hasil = await fileScannerRef.current.scanFile(file, /* showImage */ false)
      await prosesScan(hasil, 'SCAN')
    } catch {
      setHasil({
        success: false,
        message: 'QR code tidak ditemukan pada gambar. Pastikan foto kartu QR jelas, tegak lurus, dan tidak blur.',
      })
      beepGagal()
    } finally {
      setFileLoading(false)
    }
  }

  /** Ganti kamera saat sedang aktif: matikan scanner lama lalu nyalakan yang dipilih. */
  async function gantiKamera(deviceId: string) {
    if (!deviceId || deviceId === kameraAktif || gantiKameraLoading) return
    setGantiKameraLoading(true)
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
          scannerRef.current.clear()
        } catch {
          // abaikan
        }
        scannerRef.current = null
      }
      setIsScanning(false)
      await startCamera(deviceId)
    } finally {
      setGantiKameraLoading(false)
    }
  }

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // abaikan
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  // Berhenti saat komponen unmount / pindah tab
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
      try {
        fileScannerRef.current?.clear()
      } catch {
        // abaikan
      }
    }
  }, [])

  // Segarkan daftar kamera bila ada kamera dicabut/dipasang saat kamera hidup
  useEffect(() => {
    if (!isScanning) return
    const md = navigator.mediaDevices
    if (!md?.addEventListener) return
    const segarkan = async () => {
      try {
        const k = await Html5Qrcode.getCameras()
        setDaftarKamera(k.map((k2, i) => ({ id: k2.id, label: k2.label || `Kamera ${i + 1}` })))
      } catch {
        // abaikan — daftar lama tetap dipakai
      }
    }
    md.addEventListener('devicechange', segarkan)
    return () => md.removeEventListener('devicechange', segarkan)
  }, [isScanning])

  async function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manualCode.trim()) return
    setManualLoading(true)
    await prosesScan(manualCode.trim(), 'MANUAL')
    setManualCode('')
    setManualLoading(false)
  }

  const styleHasil = hasil?.tipe ? TIPE_STYLE[hasil.tipe] : null

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Elemen tersembunyi untuk decoder file gambar (html5-qrcode) */}
      <div id="qr-file-region" aria-hidden="true" className="absolute w-0 h-0 overflow-hidden" />

      {/* KIRI: Kamera + input manual */}
      <div className="space-y-5">
        <Card className="border-brand-green-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-brand-green-900">
              <ScanLine className="w-5 h-5 text-brand-gold-600" />
              Scan QR Code Perangkat Desa
            </CardTitle>
            <CardDescription>
              Semua perangkat absen <b>2 kali</b>: pilih mode <b>Absen Datang</b> saat tiba, lalu mode
              <b> Absen Pulang</b> saat pulang — berlaku untuk perangkat AKTIF maupun PASIF. Pindai kartu QR,
              ketik NIK/NIPD, atau unggah gambar mengikuti mode yang dipilih.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PEMILIH MODE ABSEN: DATANG / PULANG */}
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Mode absen">
              <button
                type="button"
                onClick={() => setModeAbsen('DATANG')}
                aria-pressed={modeAbsen === 'DATANG'}
                className={`flex items-center justify-center gap-2 h-12 rounded-lg border-2 font-bold text-sm transition-colors ${
                  modeAbsen === 'DATANG'
                    ? 'bg-brand-green-700 border-brand-green-800 text-white shadow-sm'
                    : 'bg-white border-brand-green-100 text-brand-green-700 hover:bg-brand-green-50'
                }`}
              >
                <LogIn className="w-5 h-5" />
                1 ABSEN DATANG
              </button>
              <button
                type="button"
                onClick={() => setModeAbsen('PULANG')}
                aria-pressed={modeAbsen === 'PULANG'}
                className={`flex items-center justify-center gap-2 h-12 rounded-lg border-2 font-bold text-sm transition-colors ${
                  modeAbsen === 'PULANG'
                    ? 'bg-brand-gold-500 border-brand-gold-600 text-brand-green-950 shadow-sm'
                    : 'bg-white border-brand-gold-100 text-brand-gold-600 hover:bg-brand-gold-50'
                }`}
              >
                <LogOut className="w-5 h-5" />
                2 ABSEN PULANG
              </button>
            </div>
            <div
              className={`relative rounded-xl overflow-hidden border-2 ${isScanning ? 'border-brand-gold-500' : 'border-dashed border-brand-green-100'} bg-brand-green-950 min-h-[300px]`}
            >
              {/* Elemen khusus scanner: JANGAN beri children React di dalamnya.
                  Video kamera html5-qrcode disuntikkan ke div ini — anak React
                  di dalamnya akan MENGHAPUS video tersebut saat re-render
                  (penyebab kamera tampil lalu langsung hilang). */}
              <div
                id="qr-reader-region"
                className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              />
              {!isScanning && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-brand-green-100 gap-3 p-6 text-center">
                  <Camera className="w-12 h-12 text-brand-gold-400" />
                  <p className="text-sm">
                    {starting
                      ? 'Menyiapkan kamera... izinkan akses kamera bila browser meminta.'
                      : 'Kamera belum aktif. Klik tombol di bawah untuk memulai scan QR Code.'}
                  </p>
                  {starting && <LoaderCircle className="w-6 h-6 animate-spin text-brand-gold-400" />}
                </div>
              )}
              {isScanning && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold tracking-widest text-white pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </div>
              )}
            </div>

            {/* Status GPS */}
            <div
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
                gpsStatus === 'AKTIF'
                  ? 'bg-brand-green-50 text-brand-green-800 border border-brand-green-100'
                  : 'bg-brand-gold-50 text-brand-green-900 border border-brand-gold-100'
              }`}
            >
              {gpsStatus === 'MENGAMBIL' ? (
                <LoaderCircle className="w-3.5 h-3.5 animate-spin shrink-0 text-brand-green-600" />
              ) : (
                <MapPin className="w-3.5 h-3.5 shrink-0 text-brand-gold-600" />
              )}
              {gpsStatus === 'MENGAMBIL' && <span>Mengambil lokasi GPS...</span>}
              {gpsStatus === 'AKTIF' && (
                <span>
                  Lokasi GPS aktif <b>±{Math.round(gps?.akurasi ?? 0)} m</b>
                  <span className="font-mono text-[10px] text-muted-foreground ml-1">
                    ({gps?.latitude.toFixed(5)}, {gps?.longitude.toFixed(5)})
                  </span>
                  — setiap absen akan menyimpan lokasi ini
                </span>
              )}
              {gpsStatus === 'TIDAK_AKTIF' && (
                <span>
                  GPS belum diizinkan — absen tetap tercatat <b>tanpa lokasi</b>. Izinkan lokasi pada browser
                  untuk mencatat posisi saat absen.
                </span>
              )}
              {gpsStatus === 'TIDAK_TERSEDIA' && <span>Perangkat tidak mendukung GPS — absen tanpa lokasi.</span>}
            </div>

            {isScanning && daftarKamera.length > 1 && (
              <div className="flex items-center gap-2">
                <SwitchCamera className="w-4 h-4 text-brand-green-700 shrink-0" />
                <Select value={kameraAktif} onValueChange={gantiKamera} disabled={gantiKameraLoading}>
                  <SelectTrigger className="h-9 border-brand-green-100 bg-white">
                    <SelectValue placeholder="Pilih kamera" />
                  </SelectTrigger>
                  <SelectContent>
                    {daftarKamera.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {gantiKameraLoading && <LoaderCircle className="w-4 h-4 animate-spin text-brand-green-700" />}
              </div>
            )}

            {/* Saran proaktif saat berjalan dalam pratinjau tersemat (iframe) */}
            {!isScanning && !cameraError && dalamIframe() && (
              <div className="rounded-md bg-brand-gold-50 border border-brand-gold-100 text-brand-green-900 text-xs px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2.5">
                <span className="flex items-start gap-2 flex-1">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-gold-600" />
                  Halaman berjalan dalam pratinjau tersemat yang bisa memblokir izin kamera.
                  Klik "Nyalakan Kamera &amp; Scan" lalu pilih <b>Allow/Izinkan</b> saat browser bertanya.
                  Bila kamera tetap gagal, buka di tab baru.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(window.location.href, '_blank', 'noopener')}
                  className="self-start sm:self-auto h-8 shrink-0 border-brand-gold-400 text-brand-green-900 hover:bg-brand-gold-100"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Buka di Tab Baru
                </Button>
              </div>
            )}

            {cameraError && (
              <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <CameraOff className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
                {dalamIframe() && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(window.location.href, '_blank', 'noopener')}
                    className="self-start h-8 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Buka di Tab Baru — agar izin kamera dapat diberikan
                  </Button>
                )}
              </div>
            )}

            {isScanning ? (
              <Button
                onClick={stopCamera}
                variant="outline"
                className="w-full h-11 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                <CameraOff className="w-5 h-5" />
                Matikan Kamera
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => startCamera()}
                  disabled={starting}
                  className="w-full h-11 bg-brand-green-800 hover:bg-brand-green-700 text-white font-semibold"
                >
                  {starting ? (
                    <>
                      <LoaderCircle className="w-5 h-5 animate-spin" />
                      Menyiapkan kamera...
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      Nyalakan Kamera &amp; Scan
                    </>
                  )}
                </Button>
                {/* Cadangan tanpa kamera: pindai QR langsung dari file gambar */}
                <Button
                  variant="outline"
                  disabled={fileLoading || starting}
                  onClick={() => document.getElementById('input-file-qr')?.click()}
                  className="w-full h-10 border-brand-green-100 text-brand-green-800 hover:bg-brand-green-50"
                >
                  {fileLoading ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Membaca gambar...
                    </>
                  ) : (
                    <>
                      <FileImage className="w-4 h-4" />
                      Pindai QR dari File Gambar (tanpa kamera)
                    </>
                  )}
                </Button>
                <input
                  id="input-file-qr"
                  type="file"
                  accept="image/*"
                  onChange={handleFileGambar}
                  className="hidden"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-brand-green-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-brand-green-900 text-base">
              <Keyboard className="w-5 h-5 text-brand-gold-600" />
              Input Manual (Cadangan)
            </CardTitle>
            <CardDescription>
              Ketik NIK (16 digit) atau kode NIPD (contoh: NIPD-001) jika kartu QR rusak atau tertinggal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManual} className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Contoh: 1771060608850000 atau NIPD-001"
                className="h-11 border-brand-green-100"
                aria-label="NIK atau NIPD"
              />
              <Button
                type="submit"
                disabled={manualLoading || !manualCode.trim()}
                className="h-11 bg-brand-gold-500 hover:bg-brand-gold-600 text-brand-green-950 font-semibold shrink-0"
              >
                {manualLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : 'Absen'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* HASIL SCAN */}
        {hasil && styleHasil && (
          <div className={`rounded-xl border-2 ${styleHasil.bg} p-5 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className="flex items-start gap-3">
              {styleHasil.icon}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm tracking-wide">{styleHasil.label}</p>
                <p className="text-sm mt-0.5 break-words">{hasil.message}</p>
                {hasil.data?.perangkat && (
                  <div className="mt-3 pt-3 border-t border-black/10 text-sm space-y-1">
                    <p className="font-semibold text-base flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      {hasil.data.perangkat.nama}
                    </p>
                    <p className="text-muted-foreground">
                      {hasil.data.perangkat.nipd} &bull; {hasil.data.perangkat.jabatan}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {hasil.data.jamDatang && (
                        <Badge variant="outline" className="bg-white/70">
                          <Clock className="w-3 h-3 mr-1" />
                          Datang: {hasil.data.jamDatang.slice(0, 5)} WIB
                        </Badge>
                      )}
                      {hasil.data.jamPulang && (
                        <Badge variant="outline" className="bg-white/70">
                          <Clock className="w-3 h-3 mr-1" />
                          Pulang: {hasil.data.jamPulang.slice(0, 5)} WIB
                        </Badge>
                      )}
                      <Badge
                        className={
                          hasil.data.kategori === 'AKTIF'
                            ? 'bg-brand-green-700 text-white'
                            : 'bg-brand-gold-500 text-brand-green-950'
                        }
                      >
                        {hasil.data.kategori === 'AKTIF' ? 'AKTIF' : 'PASIF'}
                      </Badge>
                    </div>
                    {hasil.data.kategori === 'PASIF' && hasil.data.perangkat?.keterangan && (
                      <p className="text-xs italic text-muted-foreground pt-0.5">
                        Ket: {hasil.data.perangkat.keterangan}
                      </p>
                    )}
                    {/* Tautan lokasi GPS absen */}
                    {(hasil.data.latitude != null || hasil.data.latPulang != null) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        {hasil.data.latitude != null && hasil.data.longitude != null && (
                          <a
                            href={`https://www.google.com/maps?q=${hasil.data.latitude},${hasil.data.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-green-700 underline underline-offset-2 hover:text-brand-green-900"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Lokasi Datang
                            {hasil.data.akurasi != null && (
                              <span className="font-normal">(±{Math.round(hasil.data.akurasi)} m)</span>
                            )}
                          </a>
                        )}
                        {hasil.data.latPulang != null && hasil.data.lonPulang != null && (
                          <a
                            href={`https://www.google.com/maps?q=${hasil.data.latPulang},${hasil.data.lonPulang}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-gold-600 underline underline-offset-2 hover:text-brand-gold-600"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Lokasi Pulang
                            {hasil.data.akurasiPulang != null && (
                              <span className="font-normal">(±{Math.round(hasil.data.akurasiPulang)} m)</span>
                            )}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KANAN: Daftar absensi hari ini */}
      <Card className="border-brand-green-100 self-start">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-brand-green-900">
              <Clock className="w-5 h-5 text-brand-gold-600" />
              Absensi Hari Ini
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={muatAbsensiHariIni}
              className="text-brand-green-700 hover:text-brand-green-900 hover:bg-brand-green-50"
            >
              <RefreshCw className="w-4 h-4" />
              Muat ulang
            </Button>
          </div>
          <CardDescription>
            {absensiHariIni.length} dari 12 perangkat desa sudah tercatat hadir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-10">
              <LoaderCircle className="w-6 h-6 animate-spin text-brand-green-700" />
            </div>
          ) : absensiHariIni.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ScanLine className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada yang absen hari ini.</p>
            </div>
          ) : (
            <ul className="max-h-[540px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {absensiHariIni.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-brand-green-50 bg-brand-green-50/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-brand-green-900 truncate">
                      {a.perangkat?.nama}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.perangkat?.nipd} &bull; {a.perangkat?.jabatan}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-medium text-brand-green-800">
                      Masuk {a.jamDatang?.slice(0, 5)}
                    </span>
                    {a.jamPulang ? (
                      <span className="text-xs font-medium text-brand-gold-600">
                        Pulang {a.jamPulang.slice(0, 5)}
                      </span>
                    ) : (
                      <Badge
                        className={
                          a.kategori === 'AKTIF'
                            ? 'bg-brand-green-100 text-brand-green-800 hover:bg-brand-green-100 text-[10px]'
                            : 'bg-brand-gold-100 text-brand-gold-600 hover:bg-brand-gold-100 text-[10px]'
                        }
                      >
                        Belum pulang
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
