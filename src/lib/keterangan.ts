// Keterangan status absensi perangkat desa (dipakai UI, API, dan seed)
export const KET_AKTIF = 'Aktif berkegiatan di kantor desa'

/** Pasif jenis 1: bertugas di dusunnya masing-masing, bukan di kantor desa */
export const KET_PASIF_DUSUN = 'Berkegiatan di dusun masing-masing (tidak di kantor desa)'

/** Pasif jenis 2: tidak berkegiatan di desa sama sekali */
export const KET_PASIF_TIDAK_DI_DESA = 'Tidak berkegiatan di desa'

/** Pilihan keterangan pasif untuk dropdown UI */
export const PILIHAN_KET_PASIF = [
  { value: 'DUSUN', label: KET_PASIF_DUSUN },
  { value: 'TIDAK_DI_DESA', label: KET_PASIF_TIDAK_DI_DESA },
] as const

/**
 * Keterangan pasif otomatis berdasarkan jabatan:
 * jabatan mengandung "Dusun" (Kepala Dusun I-V) -> berkegiatan di dusunnya,
 * selain itu -> tidak berkegiatan di desa.
 */
export function keteranganPasifOtomatis(jabatan: string): string {
  return /dusun/i.test(jabatan) ? KET_PASIF_DUSUN : KET_PASIF_TIDAK_DI_DESA
}

/** Terjemahkan pilihan dropdown ('DUSUN' | 'TIDAK_DI_DESA' | lain) ke teks keterangan. */
export function teksKeteranganPasif(pilihan?: string | null): string | null {
  if (pilihan === 'DUSUN') return KET_PASIF_DUSUN
  if (pilihan === 'TIDAK_DI_DESA') return KET_PASIF_TIDAK_DI_DESA
  return null
}
