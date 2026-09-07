import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Nama pengguna dan kata sandi wajib diisi' },
        { status: 400 }
      )
    }

    const admin = await db.admin.findUnique({ where: { username } })
    if (!admin || admin.password !== password) {
      return NextResponse.json(
        { success: false, message: 'Nama pengguna atau kata sandi salah' },
        { status: 401 }
      )
    }

    const token = createToken(admin.username)
    return NextResponse.json({
      success: true,
      token,
      admin: { id: admin.id, username: admin.username, nama: admin.nama },
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
