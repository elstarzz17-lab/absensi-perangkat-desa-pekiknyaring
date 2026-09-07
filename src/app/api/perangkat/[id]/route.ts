import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { KET_AKTIF, keteranganPasifOtomatis, teksKeteranganPasif } from '@/lib/keterangan'

// PATCH: ubah status AKTIF/PASIF atau edit data perangkat
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Tidak memiliki akses' }, { status: 401 })
    }

    const { id } = await ctx.params
    const perangkatId = Number(id)
    const body = await req.json()

    const existing = await db.perangkat.findUnique({ where: { id: perangkatId } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Perangkat desa tidak ditemukan' }, { status: 404 })
    }

    // Toggle status
    if (body.toggleStatus) {
      const newStatus = existing.status === 'AKTIF' ? 'PASIF' : 'AKTIF'
      const updated = await db.perangkat.update({
        where: { id: perangkatId },
        data: {
          status: newStatus,
          keterangan:
            newStatus === 'PASIF' ? keteranganPasifOtomatis(existing.jabatan) : KET_AKTIF,
        },
      })
      return NextResponse.json({
        success: true,
        data: updated,
        message: `${updated.nama} sekarang berstatus ${newStatus}`,
      })
    }

    // Edit umum
    const { nama, nik, jabatan, jenisKelamin, pendidikan, nomorSk, ttl, status, keteranganPasif } = body
    const jadiPasif = status === 'PASIF'
    const updated = await db.perangkat.update({
      where: { id: perangkatId },
      data: {
        ...(nama !== undefined && { nama }),
        ...(nik !== undefined && { nik: nik || null }),
        ...(jabatan !== undefined && { jabatan }),
        ...(jenisKelamin !== undefined && { jenisKelamin }),
        ...(pendidikan !== undefined && { pendidikan: pendidikan || null }),
        ...(nomorSk !== undefined && { nomorSk: nomorSk || null }),
        ...(ttl !== undefined && { ttl: ttl || null }),
        ...(status !== undefined && {
          status,
          keterangan: jadiPasif
            ? (teksKeteranganPasif(keteranganPasif) ??
               keteranganPasifOtomatis(jabatan ?? existing.jabatan))
            : KET_AKTIF,
        }),
      },
    })
    return NextResponse.json({ success: true, data: updated, message: 'Data berhasil diperbarui' })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui data' },
      { status: 500 }
    )
  }
}

// DELETE: hapus perangkat desa
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Tidak memiliki akses' }, { status: 401 })
    }

    const { id } = await ctx.params
    const perangkatId = Number(id)

    const existing = await db.perangkat.findUnique({ where: { id: perangkatId } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Perangkat desa tidak ditemukan' }, { status: 404 })
    }

    await db.perangkat.delete({ where: { id: perangkatId } })
    return NextResponse.json({ success: true, message: `${existing.nama} beserta riwayat absensinya telah dihapus` })
  } catch {
    return NextResponse.json({ success: false, message: 'Gagal menghapus data' }, { status: 500 })
  }
}
