/**
 * SEED ADMIN AWAL — aman diunggah ke GitHub (tanpa data pribadi penduduk).
 *
 * Membuat akun admin pertama bila database masih kosong. Nilai diambil dari
 * env (lihat .env.example) sehingga kredensial tidak tertulis di kode.
 *
 * Jalankan setelah  npm run db:push :
 *   npm run db:seed
 *
 * Data perangkat desa (nama/NIK/NIPD) TIDAK diisi di sini — tambahkan lewat
 * menu "Data Perangkat" di aplikasi, atau tulis seed Anda sendiri secara lokal.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const username = process.env.ADMIN_USERNAME || 'admindesapekiknyaring'
const password = process.env.ADMIN_PASSWORD || 'admindesa123'
const nama = process.env.ADMIN_NAMA || 'Admin Desa'

async function main() {
  const ada = await db.admin.findUnique({ where: { username } })
  if (ada) {
    console.log(`Akun admin "${username}" sudah ada — tidak ada yang diubah.`)
    return
  }
  await db.admin.create({
    data: { username, password, nama },
  })
  console.log(`Akun admin berhasil dibuat:`)
  console.log(`  Nama pengguna : ${username}`)
  console.log(`  Kata sandi    : ${password}  (ganti segera setelah deploy!)`)
  console.log('')
  console.log('Langkah berikutnya: masuk ke aplikasi lalu tambahkan data perangkat desa pada menu "Data Perangkat".')
}

main()
  .catch((e) => {
    console.error('Seed gagal:', e.message)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
