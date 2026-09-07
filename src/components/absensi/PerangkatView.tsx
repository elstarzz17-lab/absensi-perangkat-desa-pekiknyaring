'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch, type Perangkat } from '@/lib/client-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { KET_PASIF_DUSUN, KET_PASIF_TIDAK_DI_DESA } from '@/lib/keterangan'
import {
  Users, LoaderCircle, ToggleLeft, UserPlus, Trash2, RefreshCw, Search, IdCard,
} from 'lucide-react'

export default function PerangkatView({ refreshToken, onMutate }: { refreshToken: number; onMutate: () => void }) {
  const [data, setData] = useState<Perangkat[]>([])
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [toggleLoading, setToggleLoading] = useState<number | null>(null)
  const [hapusTarget, setHapusTarget] = useState<Perangkat | null>(null)
  const [dialogTambah, setDialogTambah] = useState(false)
  const [tambahLoading, setTambahLoading] = useState(false)
  const { toast } = useToast()

  // Form tambah
  const [fNama, setFNama] = useState('')
  const [fNik, setFNik] = useState('')
  const [fJabatan, setFJabatan] = useState('')
  const [fJk, setFJk] = useState('Laki-laki')
  const [fPendidikan, setFPendidikan] = useState('')
  const [fSk, setFSk] = useState('')
  const [fStatus, setFStatus] = useState('AKTIF')
  const [fKetPasif, setFKetPasif] = useState('OTOMATIS')

  const muat = useCallback(async () => {
    try {
      const res = await authFetch('/api/perangkat')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      // abaikan
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat, refreshToken])

  async function toggleStatus(p: Perangkat) {
    setToggleLoading(p.id)
    try {
      const res = await authFetch(`/api/perangkat/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ toggleStatus: true }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Status diperbarui', description: json.message })
        muat()
      } else {
        toast({ title: 'Gagal', description: json.message, variant: 'destructive' })
      }
    } finally {
      setToggleLoading(null)
    }
  }

  async function hapusPerangkat() {
    if (!hapusTarget) return
    try {
      const res = await authFetch(`/api/perangkat/${hapusTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Terhapus', description: json.message })
        muat()
        onMutate()
      } else {
        toast({ title: 'Gagal', description: json.message, variant: 'destructive' })
      }
    } finally {
      setHapusTarget(null)
    }
  }

  async function tambahPerangkat(e: React.FormEvent) {
    e.preventDefault()
    setTambahLoading(true)
    try {
      const res = await authFetch('/api/perangkat', {
        method: 'POST',
        body: JSON.stringify({
          nama: fNama,
          nik: fNik || null,
          jabatan: fJabatan,
          jenisKelamin: fJk,
          pendidikan: fPendidikan || null,
          nomorSk: fSk || null,
          status: fStatus,
          keteranganPasif: fStatus === 'PASIF' && fKetPasif !== 'OTOMATIS' ? fKetPasif : undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Berhasil', description: json.message })
        setDialogTambah(false)
        setFNama(''); setFNik(''); setFJabatan(''); setFPendidikan(''); setFSk(''); setFStatus('AKTIF'); setFJk('Laki-laki'); setFKetPasif('OTOMATIS')
        muat()
        onMutate()
      } else {
        toast({ title: 'Gagal', description: json.message, variant: 'destructive' })
      }
    } finally {
      setTambahLoading(false)
    }
  }

  const filtered = data.filter(
    (p) =>
      p.nama.toLowerCase().includes(cari.toLowerCase()) ||
      p.nipd.toLowerCase().includes(cari.toLowerCase()) ||
      p.jabatan.toLowerCase().includes(cari.toLowerCase()) ||
      (p.nik ?? '').includes(cari)
  )

  return (
    <div className="space-y-5">
      <Card className="border-brand-green-100">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-brand-green-900">
                <Users className="w-5 h-5 text-brand-gold-600" />
                Data Perangkat Desa ({data.length})
              </CardTitle>
              <CardDescription className="mt-1">
                Kelola data perangkat &amp; status keaktifan. Kartu QR menggunakan NIK (atau NIPD bila NIK kosong).
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={muat}
                className="border-brand-green-100 text-brand-green-800 hover:bg-brand-green-50"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setDialogTambah(true)}
                className="bg-brand-green-800 hover:bg-brand-green-700 text-white"
              >
                <UserPlus className="w-4 h-4" />
                Tambah
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama, NIPD, NIK, atau jabatan..."
              className="pl-10 border-brand-green-100"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <LoaderCircle className="w-7 h-7 animate-spin text-brand-green-700" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-brand-green-50">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-brand-green-50 text-brand-green-900">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">NIPD</th>
                    <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Nama</th>
                    <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">NIK</th>
                    <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Jabatan</th>
                    <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Status</th>
                    <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Keterangan</th>
                    <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t border-brand-green-50 hover:bg-brand-green-50/50">
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-brand-green-800 whitespace-nowrap">
                        {p.nipd}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-brand-green-900">{p.nama}</p>
                        <p className="text-xs text-muted-foreground">{p.jenisKelamin}{p.pendidikan ? ` • ${p.pendidikan}` : ''}</p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{p.nik ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2.5">{p.jabatan}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge
                          className={
                            p.status === 'AKTIF'
                              ? 'bg-brand-green-700 text-white hover:bg-brand-green-700'
                              : 'bg-brand-gold-500 text-brand-green-950 hover:bg-brand-gold-500'
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[220px]">{p.keterangan ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={toggleLoading === p.id}
                            onClick={() => toggleStatus(p)}
                            className={
                              p.status === 'AKTIF'
                                ? 'h-8 border-brand-gold-500 text-brand-gold-600 hover:bg-brand-gold-50 hover:text-brand-gold-600'
                                : 'h-8 border-brand-green-600 text-brand-green-700 hover:bg-brand-green-50 hover:text-brand-green-700'
                            }
                            title={p.status === 'AKTIF' ? 'Jadikan PASIF' : 'Jadikan AKTIF'}
                          >
                            {toggleLoading === p.id ? (
                              <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ToggleLeft className="w-3.5 h-3.5" />
                            )}
                            {p.status === 'AKTIF' ? 'Jadi PASIF' : 'Jadi AKTIF'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setHapusTarget(p)}
                            className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-muted-foreground">
                        Tidak ada data yang cocok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog tambah */}
      <Dialog open={dialogTambah} onOpenChange={setDialogTambah}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-green-900">
              <IdCard className="w-5 h-5 text-brand-gold-600" />
              Tambah Perangkat Desa
            </DialogTitle>
            <DialogDescription>
              NIPD dibuat otomatis berurutan. QR code kartu akan menggunakan NIK bila diisi, atau NIPD bila NIK kosong.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={tambahPerangkat} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-brand-green-900">Nama Lengkap *</Label>
              <Input value={fNama} onChange={(e) => setFNama(e.target.value)} required placeholder="Contoh: Rori Septiawan Putra" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-brand-green-900">NIK (16 digit)</Label>
              <Input value={fNik} onChange={(e) => setFNik(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="Kosongkan bila belum ada" inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-brand-green-900">Jabatan *</Label>
              <Input value={fJabatan} onChange={(e) => setFJabatan(e.target.value)} required placeholder="Contoh: Kepala Dusun VI" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-brand-green-900">Jenis Kelamin</Label>
              <Select value={fJk} onValueChange={setFJk}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="Perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-brand-green-900">Pendidikan Terakhir</Label>
              <Input value={fPendidikan} onChange={(e) => setFPendidikan(e.target.value)} placeholder="SLTA / S1 / dll" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-brand-green-900">Nomor SK</Label>
              <Input value={fSk} onChange={(e) => setFSk(e.target.value)} placeholder="Contoh: 17" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-brand-green-900">Status Absensi</Label>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AKTIF">AKTIF — berkegiatan di kantor desa</SelectItem>
                  <SelectItem value="PASIF">PASIF — berkegiatan di dusun / tidak di kantor desa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {fStatus === 'PASIF' && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-brand-green-900">Keterangan Pasif</Label>
                <Select value={fKetPasif} onValueChange={setFKetPasif}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OTOMATIS">Otomatis sesuai jabatan (Kepala Dusun → di dusunnya)</SelectItem>
                    <SelectItem value="DUSUN">{KET_PASIF_DUSUN}</SelectItem>
                    <SelectItem value="TIDAK_DI_DESA">{KET_PASIF_TIDAK_DI_DESA}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Penjelasan alasan pasif yang tampil di kartu QR &amp; hasil scan.
                </p>
              </div>
            )}
            <DialogFooter className="sm:col-span-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogTambah(false)}>Batal</Button>
              <Button type="submit" disabled={tambahLoading} className="bg-brand-green-800 hover:bg-brand-green-700 text-white">
                {tambahLoading && <LoaderCircle className="w-4 h-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!hapusTarget} onOpenChange={(o) => !o && setHapusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus perangkat desa?</AlertDialogTitle>
            <AlertDialogDescription>
              {hapusTarget?.nama} ({hapusTarget?.nipd}) akan dihapus beserta seluruh riwayat absensinya. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={hapusPerangkat} className="bg-red-600 hover:bg-red-700 text-white">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
