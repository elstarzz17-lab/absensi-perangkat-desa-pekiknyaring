# Sistem Absensi QR Perangkat Desa

Aplikasi absensi berbasis **QR Code** untuk perangkat desa: pindai kartu QR
dengan kamera HP/laptop, tercatat otomatis jam datang & jam pulang beserta
lokasi GPS.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748)](https://www.prisma.io)

## Fitur

- **Scan QR dengan kamera** — otomatis memilih kamera belakang di HP, ingat
  kamera terakhir yang dipakai, dan punya rantai cadangan bila kamera gagal
  menyala (ID kamera basi, perangkat berubah, dsb.)
- **Mode absen Datang / Pulang** — operator memilih mode sebelum memindai;
  perangkat absen 2 kali sehari
- **Input manual** — ketik NIK/NIPD bila kartu QR rusak atau tertinggal
- **Scan dari file gambar** — cadangan tanpa kamera sama sekali
- **Lokasi GPS** — posisi mencatat otomatis setiap absen (link Google Maps)
- **Kategori AKTIF/PASIF** — keterangan status otomatis per jabatan
- **Dashboard & rekap** — statistik harian/bulanan, riwayat, ekspor Excel
- **Kartu QR cetak** — generator kartu QR siap cetak dengan logo desa

## Teknologi

| Bagian   | Teknologi                              |
| -------- | -------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui |
| Backend  | API Routes Next.js, Prisma ORM         |
| Database | SQLite (satu file, mudah dipindah)     |
| Scanner  | html5-qrcode                           |

## Menjalankan di Komputer

Prasyarat: **Node.js 18+** (atau Bun).

```bash
# 1. Unduh kode
git clone https://github.com/USERNAME/absensi-qr-desa.git
cd absensi-qr-desa

# 2. Pasang dependensi
npm install

# 3. Siapkan konfigurasi
cp .env.example .env
#   -> buka .env, ganti nama desa & AUTH_SECRET (lihat bagian di bawah)

# 4. Buat database + akun admin
mkdir -p db
npm run db:push
npm run db:seed

# 5. Jalankan
npm run dev
# buka http://localhost:3000
```

Login pertama memakai akun dari `ADMIN_USERNAME`/`ADMIN_PASSWORD` di `.env`
(bawaan: `admindesapekiknyaring` / `admindesa123` — **ganti segera** di
database atau lewat `.env` sebelum seed).

## Mengganti Nama & Domain (Tanpa Ubah Kode)

Semua identitas aplikasi diatur lewat file **`.env`** — cukup ubah nilai,
lalu jalankan ulang aplikasi (atau build ulang untuk produksi):

| Variabel                    | Mengatur apa                                    | Bawaan |
| --------------------------- | ----------------------------------------------- | ------ |
| `NEXT_PUBLIC_NAMA_APLIKASI` | Judul lengkap di tab browser & hasil pencarian  | Sistem Absensi QR Perangkat Desa \<NamaDesa\> |
| `NEXT_PUBLIC_NAMA_DESA`     | Nama desa di header, login, footer, kartu QR    | `Pekik Nyaring` |
| `NEXT_PUBLIC_KECAMATAN`     | Kecamatan                                       | `Pondok Kelapa` |
| `NEXT_PUBLIC_KABUPATEN`     | Kabupaten                                       | `Bengkulu Tengah` |
| `NEXT_PUBLIC_NAMA_PEMERINTAH` | Nama lembaga di kartu QR & footer             | Pemerintah Desa \<NamaDesa\> |
| `NEXT_PUBLIC_LOGO`          | Path logo (letakkan file di `public/`)          | `/logo-kabupaten-bengkulu-tengah.png` |
| `NEXT_PUBLIC_DOMAIN`        | Domain publik untuk metadata/canonical          | (kosong) |

Contoh memakai untuk desa lain — isi `.env`:

```env
NEXT_PUBLIC_NAMA_DESA="Sukamaju"
NEXT_PUBLIC_KECAMATAN="Padang Jaya"
NEXT_PUBLIC_KABUPATEN="Bengkulu Utara"
NEXT_PUBLIC_DOMAIN="absensi.desasukamaju.id"
NEXT_PUBLIC_LOGO="/logo-desa-sukamaju.png"
```

Ingin logo berbeda? Taruh file gambar di folder `public/` lalu isi
`NEXT_PUBLIC_LOGO="/nama-file.png"`.

## Publish ke GitHub

> **Penting**: database SQLite & seed berisi **NIK (data pribadi)** sudah
> dikecualikan lewat `.gitignore` — tidak akan ikut terunggah. Data pribadi
> penduduk tetap aman di komputer/server Anda.

```bash
# 1. Buat repositori kosong baru di github.com (tanpa README bawaan)

# 2. Hubungkan & unggah
git remote add origin https://github.com/USERNAME/absensi-qr-desa.git
git push -u origin main
```

Nama repositori bebas — bisa diganti kapan saja di pengaturan repositori,
aplikasi tidak terpengaruh.

## Deploy Online

Kamera scanner **wajib HTTPS** (kecuali `localhost`) — pastikan domain
memakai SSL sebelum dipakai sehari-hari.

### Pilihan A — VPS / server sendiri (data permanen, disarankan)

```bash
npm install
npm run build          # hasil: folder .next/standalone
DATABASE_URL="file:../db/custom.db" AUTH_SECRET="rahasia-panjang" \
  node .next/standalone/server.js   # PORT=3000 default
```

Arahkan domain (mis. `absensi.desaXX.id`) lewat Nginx reverse proxy ke
port aplikasi, lalu pasang SSL gratis dengan Certbot (Let's Encrypt).

### Pilihan B — Vercel (praktis untuk demo/ujicoba)

1. Push ke GitHub, lalu import repo di [vercel.com](https://vercel.com)
2. Isi Environment Variables dari `.env.example` (`DATABASE_URL`,
   `AUTH_SECRET`, `NEXT_PUBLIC_*`)
3. Deploy

**Catatan**: filesystem Vercel bersifat sementara (serverless), sehingga
**data SQLite bisa hilang saat redeploy** — cocok untuk demo, tidak untuk
data absensi resmi. Untuk produksi gunakan Pilihan A, atau pindahkan
database ke penyedia SQL (Prisma tinggal ganti `provider` di
`prisma/schema.prisma`).

### Mengganti domain setelah deploy

- **VPS**: arahkan DNS ke server + sesuaikan Nginx — selesai.
- **Vercel**: Project Settings → Domains → tambahkan domain, ikuti setup DNS.
  Isi juga `NEXT_PUBLIC_DOMAIN` lalu deploy ulang agar metadata ikut baru.

## Keamanan

- Kredensial & kunci diatur lewat `.env` yang **tidak** ikut ke GitHub
- Token login bertanda tangan HMAC (`AUTH_SECRET`) berlaku 30 hari
- Ubah `AUTH_SECRET` menjadi teks acak panjang sebelum deploy publik
  (contoh: `openssl rand -hex 32`)
- Data absensi & GPS hanya tersimpan di database milik desa

## Struktur Singkat

```
src/
├── app/
│   ├── api/            # REST API (scan, absensi, perangkat, export, auth)
│   └── layout.tsx      # Metadata aplikasi (dari site-config)
├── components/absensi/ # ScanView, Dashboard, Riwayat, Kartu QR, Login
└── lib/
    ├── site-config.ts  # ★ KONFIGURASI NAMA & DOMAIN (via .env)
    ├── auth.ts         # Token HMAC
    └── db.ts           # Koneksi Prisma
prisma/schema.prisma    # Skema database
scripts/seed-admin.mjs  # Buat akun admin pertama
```
