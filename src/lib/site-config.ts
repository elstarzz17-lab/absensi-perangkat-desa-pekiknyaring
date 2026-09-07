/**
 * KONFIGURASI IDENTITAS APLIKASI — SATU-SATUNYA TEMPAT MENGUBAH NAMA & DOMAIN
 *
 * Semua nilai di bawah bisa diganti TANPA menyentuh kode, cukup dengan file
 * `.env` di akar proyek (lihat `.env.example`). Setelah mengubah `.env`,
 * jalankan ulang `npm run dev` (atau build ulang untuk mode produksi).
 *
 * Contoh memakai untuk desa lain:
 *   NEXT_PUBLIC_NAMA_DESA=Kuta Baru
 *   NEXT_PUBLIC_KECAMATAN=Kedurang
 *   NEXT_PUBLIC_KABUPATEN=Benggala
 *   NEXT_PUBLIC_DOMAIN=absensi.desakutabaru.id
 */

function ambil(kunci: string, bawaan: string): string {
  const nilai = process.env[kunci]?.trim()
  return nilai && nilai.length > 0 ? nilai : bawaan
}

// Nama desa adalah kunci identitas — komponen lain diturunkan darinya
const namaDesa = ambil('NEXT_PUBLIC_NAMA_DESA', 'Pekik Nyaring')
const kecamatan = ambil('NEXT_PUBLIC_KECAMATAN', 'Pondok Kelapa')
const kabupaten = ambil('NEXT_PUBLIC_KABUPATEN', 'Bengkulu Tengah')

export const SITE = {
  /** Judul lengkap di tab browser & metadata (dapat dioverride penuh) */
  namaAplikasi: ambil(
    'NEXT_PUBLIC_NAMA_APLIKASI',
    `Sistem Absensi QR Perangkat Desa ${namaDesa}`
  ),
  /** Nama desa — muncul di header, halaman login, dan kartu QR */
  namaDesa,
  /** Kecamatan desa */
  kecamatan,
  /** Kabupaten desa */
  kabupaten,
  /** Nama pemerintahan pada kartu QR & footer */
  pemerintahDesa: ambil('NEXT_PUBLIC_NAMA_PEMERINTAH', `Pemerintah Desa ${namaDesa}`),
  /** Path logo (letakkan file di folder public/, isi mis. /logo-desa.png) */
  logo: ambil('NEXT_PUBLIC_LOGO', '/logo-kabupaten-bengkulu-tengah.png'),
  /**
   * Domain publik situs (tanpa https://). Dipakai untuk metadata/canonical.
   * Kosongkan bila belum punya domain — aplikasi tetap jalan normal.
   */
  domain: ambil('NEXT_PUBLIC_DOMAIN', ''),
  /** Tahun hak cipta footer */
  tahunHakCipta: new Date().getFullYear(),
} as const

/** Judul singkat header aplikasi */
export const JUDUL_HEADER = `Absensi Perangkat Desa ${SITE.namaDesa}`

/** Alamat lengkap satu baris, mis. "Desa Pekik Nyaring • Kecamatan Pondok Kelapa" */
export const ALAMAT_SINGKAT = `Desa ${SITE.namaDesa} • Kecamatan ${SITE.kecamatan}`

/** Alamat kartu QR, mis. "Kec. Pondok Kelapa — Kab. Bengkulu Tengah" */
export const ALAMAT_KARTU = `Kec. ${SITE.kecamatan} — Kab. ${SITE.kabupaten}`

/** URL dasar untuk metadata (canonical/Open Graph) */
export const URL_SITUS = SITE.domain
  ? `https://${SITE.domain}`
  : 'http://localhost:3000'
