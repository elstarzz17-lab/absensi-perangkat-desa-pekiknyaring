/**
 * Instrumentasi Next.js — dijalankan sekali saat server menyala.
 * Menyiapkan database SQLite otomatis di hosting baru (lihat bootstrap-db.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { pastikanDatabaseSiap } = await import('@/lib/bootstrap-db')
  await pastikanDatabaseSiap()
}
