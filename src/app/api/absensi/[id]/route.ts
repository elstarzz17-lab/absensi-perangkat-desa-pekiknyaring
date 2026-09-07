import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// DELETE: hapus record absensi (koreksi oleh admin)
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Tidak memiliki akses' }, { status: 401 })
    }

    const { id } = await ctx.params
    const absensiId = Number(id)

    const existing = await db.absensi.findUnique({ where: { id: absensiId } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Data absensi tidak ditemukan' }, { status: 404 })
    }

    await db.absensi.delete({ where: { id: absensiId } })
    return NextResponse.json({ success: true, message: 'Data absensi berhasil dihapus' })
  } catch {
    return NextResponse.json({ success: false, message: 'Gagal menghapus data absensi' }, { status: 500 })
  }
}
