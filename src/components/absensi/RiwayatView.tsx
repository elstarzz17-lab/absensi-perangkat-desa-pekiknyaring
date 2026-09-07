'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch, type AbsensiRecord } from '@/lib/client-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getTanggalJakarta, formatTanggalIndo } from '@/lib/waktu'
import {
  History, FileSpreadsheet, LoaderCircle, Search, Trash2, Download, X, MapPin,
} from 'lucide-react'

export default function RiwayatView({ refreshToken, onMutate }: { refreshToken: number; onMutate: () => void }) {
  const [data, setData] = useState<AbsensiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dari, setDari] = useState(getTanggalJakarta())
  const [sampai, setSampai] = useState(getTanggalJakarta())
  const [q, setQ] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const { toast } = useToast()

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dari) params.set('dari', dari)
      if (sampai) params.set('sampai', sampai)
      if (q) params.set('q', q)
      const res = await authFetch(`/api/absensi?${params.toString()}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      // abaikan
    } finally {
      setLoading(false)
    }
  }, [dari, sampai, q])

  useEffect(() => {
    muat()
  }, [muat, refreshToken])

  async function exportExcel() {
    setExportLoading(true)
    try {
      const params = new URLSearchParams()
      if (dari) params.set('dari', dari)
      if (sampai) params.set('sampai', sampai)
      const res = await authFetch(`/api/export?${params.toString()}`)
      if (!res.ok) {
        toast({ title: 'Gagal', description: 'Tidak dapat mengekspor data', variant: 'destructive' })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Rekap-Absensi-Desa-Pekik-Nyaring-${dari}-sd-${sampai}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: 'Berhasil', description: 'File Excel berhasil diunduh' })
    } finally {
      setExportLoading(false)
    }
  }

  async function hapusAbsensi(id: number) {
    const res = await authFetch(`/api/absensi/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast({ title: 'Terhapus', description: json.message })
      muat()
      onMutate()
    } else {
      toast({ title: 'Gagal', description: json.message, variant: 'destructive' })
    }
  }

  function resetFilter() {
    setDari(getTanggalJakarta())
    setSampai(getTanggalJakarta())
    setQ('')
  }

  return (
    <div className="space-y-5">
      <Card className="border-brand-green-100">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-brand-green-900">
                <History className="w-5 h-5 text-brand-gold-600" />
                Riwayat Absensi
              </CardTitle>
              <CardDescription className="mt-1">
                {data.length} record ditemukan
                {dari && sampai ? ` untuk ${formatTanggalIndo(dari)} s.d. ${formatTanggalIndo(sampai)}` : ''}
              </CardDescription>
            </div>
            <Button
              onClick={exportExcel}
              disabled={exportLoading}
              className="bg-brand-gold-500 hover:bg-brand-gold-600 text-brand-green-950 font-semibold"
            >
              {exportLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="space-y-1.5">
              <Label className="text-brand-green-900 text-xs">Dari Tanggal</Label>
              <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="border-brand-green-100" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-brand-green-900 text-xs">Sampai Tanggal</Label>
              <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="border-brand-green-100" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-brand-green-900 text-xs">Cari</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nama / NIPD / jabatan"
                  className="pl-10 border-brand-green-100"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-brand-green-900 text-xs">Aksi</Label>
              <Button variant="outline" onClick={resetFilter} className="w-full border-brand-green-100 text-brand-green-800 hover:bg-brand-green-50">
                <X className="w-4 h-4" />
                Reset Filter
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <LoaderCircle className="w-7 h-7 animate-spin text-brand-green-700" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Download className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tidak ada data absensi pada rentang ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-brand-green-50 max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm min-w-[1020px]">
                <thead className="sticky top-0 bg-brand-green-50 text-brand-green-900">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Tanggal</th>
                    <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Perangkat Desa</th>
                    <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Datang</th>
                    <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Pulang</th>
                    <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Kategori</th>
                    <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Metode</th>
                    <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Lokasi GPS</th>
                    <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((a) => (
                    <tr key={a.id} className="border-t border-brand-green-50 hover:bg-brand-green-50/50">
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs font-medium text-brand-green-800">
                        {formatTanggalIndo(a.tanggal)}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-brand-green-900">{a.perangkat?.nama}</p>
                        <p className="text-xs text-muted-foreground">{a.perangkat?.nipd} &bull; {a.perangkat?.jabatan}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs">{a.jamDatang ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs">{a.jamPulang ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge
                          className={
                            a.kategori === 'AKTIF'
                              ? 'bg-brand-green-700 text-white hover:bg-brand-green-700'
                              : 'bg-brand-gold-500 text-brand-green-950 hover:bg-brand-gold-500'
                          }
                        >
                          {a.kategori === 'AKTIF' ? 'AKTIF' : 'PASIF'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs text-muted-foreground">{a.metode}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {a.latitude != null && a.longitude != null ? (
                          <a
                            href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Datang: ${a.latitude.toFixed(6)}, ${a.longitude.toFixed(6)}${
                              a.akurasi != null ? ` (±${Math.round(a.akurasi)} m)` : ''
                              }${a.latPulang != null ? `\nPulang: ${a.latPulang.toFixed(6)}, ${a.lonPulang?.toFixed(6)}` : ''}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-green-700 hover:text-brand-green-900 hover:underline"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Lihat
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => hapusAbsensi(a.id)}
                          className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Hapus record (koreksi)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
