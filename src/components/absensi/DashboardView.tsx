'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch, type AbsensiRecord } from '@/lib/client-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatTanggalIndo } from '@/lib/waktu'
import {
  Users, UserCheck, Percent, LogOut, LoaderCircle, BarChart3, History,
  Activity, UserX, UserCog,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface StatsData {
  today: string
  totalPerangkat: number
  totalAktif: number
  totalPasif: number
  hadirHariIni: number
  sudahPulang: number
  belumPulang: number
  dariAktif: number
  dariPasif: number
  persenHadir: number
  tren: Array<{ tanggal: string; hadir: number }>
  rekapPerangkat: Array<{
    nipd: string
    nama: string
    jabatan: string
    status: string
    totalHadir: number
    totalPulang: number
  }>
  terbaru: AbsensiRecord[]
}

const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function labelTanggal(tgl: string): string {
  const [, m, d] = tgl.split('-').map(Number)
  return `${d} ${BULAN_SINGKAT[m - 1]}`
}

export default function DashboardView({ refreshToken }: { refreshToken: number }) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    try {
      const res = await authFetch('/api/stats')
      const json = await res.json()
      if (json.success) setStats(json.data)
    } catch {
      // abaikan
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat, refreshToken])

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center py-24">
        <LoaderCircle className="w-8 h-8 animate-spin text-brand-green-700" />
      </div>
    )
  }

  const pieData = [
    { name: 'Perangkat AKTIF', value: stats.totalAktif, fill: '#1e6339' },
    { name: 'Perangkat PASIF', value: stats.totalPasif, fill: '#c9a227' },
  ]

  return (
    <div className="space-y-5">
      {/* Kartu statistik utama */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <Card className="border-brand-green-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Perangkat</p>
                <p className="text-3xl font-bold text-brand-green-900 mt-1">{stats.totalPerangkat}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.totalAktif} aktif &bull; {stats.totalPasif} pasif</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-green-800 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-brand-gold-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-green-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hadir Hari Ini</p>
                <p className="text-3xl font-bold text-brand-green-700 mt-1">{stats.hadirHariIni}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.dariAktif} aktif &bull; {stats.dariPasif} pasif</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-green-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-green-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Persentase Kehadiran</p>
                <p className="text-3xl font-bold text-brand-gold-600 mt-1">{stats.persenHadir}%</p>
                <div className="w-full h-2 rounded-full bg-brand-green-50 mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-gold-500 transition-all duration-500"
                    style={{ width: `${stats.persenHadir}%` }}
                  />
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-gold-500 flex items-center justify-center shrink-0">
                <Percent className="w-6 h-6 text-brand-green-950" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-green-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status Pulang</p>
                <p className="text-3xl font-bold text-brand-green-900 mt-1">
                  {stats.sudahPulang}
                  <span className="text-base text-muted-foreground font-medium"> / {stats.hadirHariIni}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stats.belumPulang} belum scan pulang</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-green-900 flex items-center justify-center shrink-0">
                <LogOut className="w-6 h-6 text-brand-gold-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafik */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="border-brand-green-100 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-brand-green-900 text-base">
              <BarChart3 className="w-5 h-5 text-brand-gold-600" />
              Tren Kehadiran 7 Hari Terakhir
            </CardTitle>
            <CardDescription>Jumlah perangkat desa yang tercatat hadir per hari.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tren} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dcefe2" vertical={false} />
                <XAxis
                  dataKey="tanggal"
                  tickFormatter={labelTanggal}
                  tick={{ fontSize: 11, fill: '#5a6b60' }}
                  axisLine={{ stroke: '#dcefe2' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#5a6b60' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${value} orang`, 'Hadir']}
                  labelFormatter={(l) => formatTanggalIndo(String(l))}
                  contentStyle={{ borderRadius: 8, borderColor: '#dcefe2', fontSize: 12 }}
                />
                <Bar dataKey="hadir" fill="#1e6339" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-brand-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-brand-green-900 text-base">
              <UserCog className="w-5 h-5 text-brand-gold-600" />
              Komposisi Perangkat
            </CardTitle>
            <CardDescription>Status keaktifan berkegiatan di desa.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  strokeWidth={0}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value) => <span style={{ fontSize: 12, color: '#17492c' }}>{value}</span>}
                />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#dcefe2', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rekap per perangkat 30 hari + aktivitas terbaru */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="border-brand-green-100 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-brand-green-900 text-base">
              <History className="w-5 h-5 text-brand-gold-600" />
              Rekap Kehadiran 30 Hari
            </CardTitle>
            <CardDescription>Total hari hadir &amp; hari absen pulang per perangkat desa.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto custom-scrollbar rounded-lg border border-brand-green-50">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-brand-green-50 text-brand-green-900">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold">Perangkat Desa</th>
                    <th className="text-center px-3 py-2.5 font-semibold">Hadir</th>
                    <th className="text-center px-3 py-2.5 font-semibold">Pulang</th>
                    <th className="text-center px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rekapPerangkat.map((p) => (
                    <tr key={p.nipd} className="border-t border-brand-green-50 hover:bg-brand-green-50/50">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-brand-green-900">{p.nama}</p>
                        <p className="text-xs text-muted-foreground">{p.nipd} &bull; {p.jabatan}</p>
                      </td>
                      <td className="text-center px-3 py-2.5 font-semibold text-brand-green-700">{p.totalHadir}</td>
                      <td className="text-center px-3 py-2.5 font-semibold text-brand-gold-600">{p.totalPulang}</td>
                      <td className="text-center px-3 py-2.5">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-brand-green-900 text-base">
              <Activity className="w-5 h-5 text-brand-gold-600" />
              Aktivitas Terbaru
            </CardTitle>
            <CardDescription>5 scan absensi terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.terbaru.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada aktivitas.</p>
            ) : (
              <ul className="space-y-3">
                {stats.terbaru.map((a) => (
                  <li key={a.id} className="flex gap-3 items-start">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        a.jamPulang ? 'bg-brand-gold-500' : 'bg-brand-green-600'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-green-900 truncate">
                        {a.perangkat?.nama}
                        <span className="font-normal text-muted-foreground">
                          {a.jamPulang ? ' — absen pulang' : ' — absen datang'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTanggalIndo(a.tanggal)} &bull;{' '}
                        {a.jamPulang ? `pulang ${a.jamPulang.slice(0, 5)}` : `datang ${a.jamDatang?.slice(0, 5)}`} WIB
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
