/**
 * BOOTSTRAP DATABASE — agar aplikasi langsung hidup saat di-deploy ke hosting
 * dengan filesystem sementara (mis. Vercel).
 *
 * Cara kerja: saat server pertama kali menyala, bila file database SQLite
 * (dari DATABASE_URL) belum ada, salin prisma/template.db (berisi skema
 * lengkap + akun admin bawaan) ke lokasi tersebut, lalu pastikan akun admin
 * dari variabel ADMIN_* tersedia.
 *
 * Di komputer sendiri / VPS (file database sudah ada) fungsi ini langsung
 * kembali tanpa melakukan apa pun — 100% tanpa efek samping.
 *
 * Semua kegagalan ditelan diam-diam: bootstrap tidak boleh menghentikan
 * server; aplikasi tetap berjalan normal.
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

export async function pastikanDatabaseSiap(): Promise<void> {
  try {
    const url = process.env.DATABASE_URL?.trim() ?? ''
    if (!url.startsWith('file:')) return // bukan SQLite — biarkan Prisma menangani

    // Path relatif pada Prisma dihitung dari folder prisma/ (lokasi schema)
    let jalur = url.slice('file:'.length)
    if (!path.isAbsolute(jalur)) {
      jalur = path.join(process.cwd(), 'prisma', jalur)
    }

    if (existsSync(jalur)) return // database sudah ada — tidak ada yang perlu dilakukan

    const templat = path.join(process.cwd(), 'prisma', 'template.db')
    if (!existsSync(templat)) return // templat tidak ikut ter-bundle — biarkan aplikasi jalan

    mkdirSync(path.dirname(jalur), { recursive: true })
    copyFileSync(templat, jalur)

    // Pastikan akun admin dari env tersedia (mendukung ADMIN_* khusus di hosting)
    const username = process.env.ADMIN_USERNAME?.trim() || 'admindesapekiknyaring'
    const password = process.env.ADMIN_PASSWORD?.trim() || 'admindesa123'
    const nama = process.env.ADMIN_NAMA?.trim() || 'Admin Desa'

    const db = new PrismaClient({ log: [] })
    try {
      const ada = await db.admin.findUnique({ where: { username } })
      if (!ada) {
        await db.admin.create({ data: { username, password, nama } })
      }
    } finally {
      await db.$disconnect()
    }
  } catch {
    // Senyap: bootstrap tidak boleh mematikan server
  }
}
