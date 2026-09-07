import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { KET_AKTIF, keteranganPasifOtomatis, teksKeteranganPasif } from '@/lib/keterangan'

// GET: daftar semua perangkat desa + absensi hari ini
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Tidak memiliki akses' }, { status: 401 })
    }

    const perangkat = await db.perangkat.findMany({
      orderBy: { id: 'asc' },
      include: {
        absensi: {
          orderBy: { tanggal: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({ success: true, data: perangkat })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

// POST: tambah perangkat desa baru
export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Tidak memiliki akses' }, { status: 401 })
    }

    const body = await req.json()
    const { nama, nik, jabatan, jenisKelamin, pendidikan, nomorSk, ttl, status, keteranganPasif } = body

    if (!nama || !jabatan) {
      return NextResponse.json(
        { success: false, message: 'Nama dan jabatan wajib diisi' },
        { status: 400 }
      )
    }

    const pasif = status === 'PASIF'
    const keterangan = pasif
      ? (teksKeteranganPasif(keteranganPasif) ?? keteranganPasifOtomatis(jabatan))
      : KET_AKTIF

    // Buat NIPD otomatis berurutan
    const jumlah = await db.perangkat.count()
    const nipd = `NIPD-${String(jumlah + 1).padStart(3, '0')}`

    const baru = await db.perangkat.create({
      data: {
        nipd,
        nama,
        nik: nik || null,
        jabatan,
        jenisKelamin: jenisKelamin || 'Laki-laki',
        pendidikan: pendidikan || null,
        nomorSk: nomorSk || null,
        ttl: ttl || null,
        status: pasif ? 'PASIF' : 'AKTIF',
        keterangan,
      },
    })

    return NextResponse.json({ success: true, data: baru, message: `Perangkat desa ditambahkan dengan ${nipd}` })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { success: false, message: 'Gagal menambah perangkat desa. NIK mungkin sudah terdaftar.' },
      { status: 500 }
    )
  }
}
