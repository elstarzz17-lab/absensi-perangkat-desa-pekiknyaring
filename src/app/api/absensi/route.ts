import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { getTanggalJakarta } from '@/lib/waktu'

// GET: riwayat absensi dengan filter tanggal & pencarian
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Tidak memiliki akses' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dari = searchParams.get('dari')
    const sampai = searchParams.get('sampai')
    const q = searchParams.get('q')?.trim()

    const today = getTanggalJakarta()
    const where: {
      tanggal?: { gte?: string; lte?: string }
      perangkat?: { OR?: Array<{ nama?: { contains: string } }, { nipd?: { contains: string } }, { jabatan?: { contains: string } }> }
    } = {}

    if (dari || sampai) {
      where.tanggal = {}
      if (dari) where.tanggal.gte = dari
      if (sampai) where.tanggal.lte = sampai
    } else {
      where.tanggal = { gte: today, lte: today }
    }

    if (q) {
      where.perangkat = {
        OR: [
          { nama: { contains: q } },
          { nipd: { contains: q } },
          { jabatan: { contains: q } },
        ],
      }
    }

    const absensi = await db.absensi.findMany({
      where,
      include: { perangkat: true },
      orderBy: [{ tanggal: 'desc' }, { jamDatang: 'desc' }],
      take: 1000,
    })

    return NextResponse.json({ success: true, data: absensi })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
