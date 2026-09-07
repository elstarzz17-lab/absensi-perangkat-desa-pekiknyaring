// Helper zona waktu WIB (Asia/Jakarta) untuk konsistensi absensi
export function getTanggalJakarta(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getJamJakarta(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatTanggalIndo(tanggal: string): string {
  const [y, m, d] = tanggal.split('-').map(Number)
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  return `${d} ${bulan[m - 1]} ${y}`
}
