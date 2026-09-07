import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { getTanggalJakarta } from '@/lib/waktu'

// GET: statistik untuk dashboard
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Tidak memiliki akses' }, { status: 401 })
    }

    const today = getTanggalJakarta()

    const totalPerangkat = await db.perangkat.count()
    const totalAktif = await db.perangkat.count({ where: { status: 'AKTIF' } })
    const totalPasif = await db.perangkat.count({ where: { status: 'PASIF' } })

    const absensiHariIni = await db.absensi.findMany({
      where: { tanggal: today },
      include: { perangkat: true },
    })

    const sudahPulang = absensiHariIni.filter((a) => a.jamPulang).length
    const belumPulang = absensiHariIni.filter((a) => !a.jamPulang).length
    const dariAktif = absensiHariIni.filter((a) => a.kategori === 'AKTIF').length
    const dariPasif = absensiHariIni.filter((a) => a.kategori === 'PASIF').length

    // Tren 7 hari terakhir
    const tren: Array<{ tanggal: string; hadir: number }> = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      // format di zona Jakarta
      const tgl = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d)
      tren.push({ tanggal: tgl, hadir: 0 })
    }

    const mulai = tren[0].tanggal
    const absensi7hari = await db.absensi.findMany({
      where: { tanggal: { gte: mulai } },
      select: { tanggal: true },
    })
    for (const a of absensi7hari) {
      const idx = tren.findIndex((t) => t.tanggal === a.tanggal)
      if (idx >= 0) tren[idx].hadir++
    }

    // Rekap per perangkat 30 hari terakhir
    const d30 = new Date()
    d30.setDate(d30.getDate() - 29)
    const tgl30 = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d30)

    const absensi30 = await db.absensi.findMany({
      where: { tanggal: { gte: tgl30 } },
      select: { perangkatId: true, tanggal: true, jamPulang: true },
    })

    const perangkatList = await db.perangkat.findMany({ orderBy: { id: 'asc' } })
    const rekapPerangkat = perangkatList.map((p) => {
      const rekaman = absensi30.filter((a) => a.perangkatId === p.id)
      return {
        nipd: p.nipd,
        nama: p.nama,
        jabatan: p.jabatan,
        status: p.status,
        totalHadir: rekaman.length,
        totalPulang: rekaman.filter((a) => a.jamPulang).length,
      }
    })

    // Aktivitas terbaru (5 scan terakhir)
    const terbaru = await db.absensi.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { perangkat: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        today,
        totalPerangkat,
        totalAktif,
        totalPasif,
        hadirHariIni: absensiHariIni.length,
        sudahPulang,
        belumPulang,
        dariAktif,
        dariPasif,
        persenHadir: totalPerangkat ? Math.round((absensiHariIni.length / totalPerangkat) * 100) : 0,
        tren,
        rekapPerangkat,
        terbaru,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
