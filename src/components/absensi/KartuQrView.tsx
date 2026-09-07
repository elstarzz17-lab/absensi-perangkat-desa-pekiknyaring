'use client'

import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { authFetch, type Perangkat } from '@/lib/client-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { LoaderCircle, Printer, QrCode, IdCard } from 'lucide-react'
import { SITE, ALAMAT_KARTU } from '@/lib/site-config'

const LOGO_SRC = SITE.logo

/** Muat gambar logo untuk ditempel di tengah QR (null bila gagal muat). */
function muatLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = LOGO_SRC
  })
}

/** Gambar persegi putih bersudut bulat sebagai latar logo di tengah QR. */
function kotakRounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fill()
}

/**
 * Buat QR dengan emblem desa di tengah.
 * Pakai error correction level H (±30% kerusakan tertoleransi) agar QR
 * tetap terbaca scanner meskipun bagian tengah tertutup logo.
 */
async function buatQrDenganLogo(isi: string, logo: HTMLImageElement | null): Promise<string> {
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, isi, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#12331f', light: '#ffffff' },
  })
  if (!logo) return canvas.toDataURL('image/png')
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas.toDataURL('image/png')

  const W = canvas.width
  // Kotak putih di tengah (±30% lebar QR) sebagai latar logo agar kontras
  const box = Math.round(W * 0.3)
  const bx = (W - box) / 2
  ctx.fillStyle = '#ffffff'
  kotakRounded(ctx, bx, bx, box, box, Math.round(box * 0.2))

  // Logo di tengah kotak, proporsi aspek dipertahankan
  const logoH = box * 0.78
  const logoW = logoH * (logo.width / logo.height)
  ctx.drawImage(logo, (W - logoW) / 2, (W - logoH) / 2, logoW, logoH)

  return canvas.toDataURL('image/png')
}

export default function KartuQrView({ refreshToken }: { refreshToken: number }) {
  const [data, setData] = useState<Perangkat[]>([])
  const [qrUrls, setQrUrls] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const muat = useCallback(async () => {
    try {
      const res = await authFetch('/api/perangkat')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        // Generate QR semua perangkat (isi = NIK, fallback NIPD) + logo di tengah
        const logo = await muatLogo()
        const urls: Record<number, string> = {}
        for (const p of json.data as Perangkat[]) {
          const isi = p.nik ?? p.nipd
          urls[p.id] = await buatQrDenganLogo(isi, logo)
        }
        setQrUrls(urls)
      }
    } catch {
      // abaikan
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat, refreshToken])

  async function unduhQr(p: Perangkat) {
    const url = qrUrls[p.id]
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `QR-${p.nipd}-${p.nama.replace(/[^a-zA-Z0-9]/g, '_')}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    toast({ title: 'Berhasil', description: `QR code ${p.nama} diunduh` })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <LoaderCircle className="w-8 h-8 animate-spin text-brand-green-700" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Card className="border-brand-green-100 print:hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-brand-green-900">
                <QrCode className="w-5 h-5 text-brand-gold-600" />
                Kartu QR Code Perangkat Desa ({data.length} kartu)
              </CardTitle>
              <CardDescription className="mt-1">
                QR berisi NIK masing-masing (NIPD bila NIK kosong) dengan emblem desa di tengah. Koreksi error level H
                menjaga QR tetap terbaca scanner. Cetak, potong, dan serahkan ke tiap perangkat desa untuk discan saat
                absen.
              </CardDescription>
            </div>
            <Button
              onClick={() => window.print()}
              className="bg-brand-green-800 hover:bg-brand-green-700 text-white font-semibold"
            >
              <Printer className="w-4 h-4" />
              Cetak Semua Kartu
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Tip: gunakan kertas tebal (art carton) atau laminasi agar kartu awet. Ukuran kartu mengikuti standar ID card
            saat dicetak — warna hijau &amp; emas kartu otomatis ikut tercetak sesuai tampilan di layar.
          </p>
        </CardContent>
      </Card>

      {/* AREA CETAK */}
      <div id="print-area" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((p) => (
          <div
            key={p.id}
            className="qr-card-print rounded-xl overflow-hidden border border-brand-green-100 shadow-sm bg-white"
          >
            {/* Kepala kartu */}
            <div className="bg-brand-green-800 px-4 py-3 flex items-center gap-3">
              <img
                src={SITE.logo}
                alt={`Logo ${SITE.kabupaten}`}
                className="w-9 h-11 object-contain shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-brand-gold-400 font-semibold">
                  {SITE.pemerintahDesa}
                </p>
                <p className="text-xs text-brand-green-100">
                  {ALAMAT_KARTU}
                </p>
              </div>
            </div>

            {/* Isi kartu */}
            <div className="p-4 flex gap-4 items-center">
              {qrUrls[p.id] ? (
                <img
                  src={qrUrls[p.id]}
                  alt={`QR ${p.nama}`}
                  className="w-28 h-28 shrink-0 rounded-lg border border-brand-green-100"
                />
              ) : (
                <div className="w-28 h-28 rounded-lg bg-brand-green-50 animate-pulse shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] font-bold text-brand-gold-600 tracking-wider">{p.nipd}</p>
                <p className="font-bold text-brand-green-900 leading-tight mt-0.5 break-words">{p.nama}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{p.jabatan}</p>
                <span
                  className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                    p.status === 'AKTIF'
                      ? 'bg-brand-green-700 text-white'
                      : 'bg-brand-gold-500 text-brand-green-950'
                  }`}
                >
                  {p.status === 'AKTIF' ? 'ABSENSI AKTIF (Datang & Pulang)' : 'ABSENSI PASIF (Datang & Pulang)'}
                </span>
                {p.status === 'PASIF' && p.keterangan && (
                  <p className="text-[10px] italic text-muted-foreground mt-1.5 leading-snug">{p.keterangan}</p>
                )}
              </div>
            </div>

            {/* Kaki kartu */}
            <div className="bg-brand-green-50 px-4 py-2 flex items-center justify-between print:hidden">
              <p className="text-[10px] text-muted-foreground font-mono">
                {p.nik ? `NIK: ${p.nik}` : 'Isi QR: NIPD'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unduhQr(p)}
                className="h-7 text-xs text-brand-green-800 hover:bg-brand-green-100"
              >
                <IdCard className="w-3.5 h-3.5 mr-1" />
                Unduh PNG
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
