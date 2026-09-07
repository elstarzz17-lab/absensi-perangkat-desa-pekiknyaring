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
git clone https://github.com/elstarzz17-lab/absensi-perangkat-desa-pekiknyaring.git
cd absensi-perangkat-desa-pekiknyaring

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

Repositori resmi: **https://github.com/elstarzz17-lab/absensi-perangkat-desa-pekiknyaring**

> **Penting**: database SQLite berisi **NIK (data pribadi)** sudah dikecualikan
> lewat `.gitignore` — tidak akan ikut terunggah. Data pribadi penduduk tetap
> aman di komputer/server Anda.

```bash
git add .
git commit -m "deskripsi perubahan"
git push
```

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

### Pilihan B — Vercel (sekali klik, langsung online)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Felstarzz17-lab%2Fabsensi-perangkat-desa-pekiknyaring&project-name=absensi-pekik-nyaring&env=DATABASE_URL,AUTH_SECRET,NEXT_PUBLIC_NAMA_DESA,NEXT_PUBLIC_KECAMATAN,NEXT_PUBLIC_KABUPATEN,NEXT_PUBLIC_NAMA_PEMERINTAH,NEXT_PUBLIC_LOGO&DATABASE_URL=file%3A%2Ftmp%2Fcustom.db&NEXT_PUBLIC_NAMA_DESA=Pekik%20Nyaring&NEXT_PUBLIC_KECAMATAN=Pondok%20Kelapa&NEXT_PUBLIC_KABUPATEN=Bengkulu%20Tengah&NEXT_PUBLIC_NAMA_PEMERINTAH=Pemerintah%20Desa%20Pekik%20Nyaring&NEXT_PUBLIC_LOGO=%2Flogo-kabupaten-bengkulu-tengah.png)

1. Klik tombol di atas → login ke Vercel **memakai akun GitHub**
2. Semua Environment Variables sudah terisi otomatis — tinggal klik **Deploy**
3. Tunggu ±2 menit → situs online di `https://absensi-pekik-nyaring.vercel.app`
   (HTTPS otomatis — kamera scanner langsung bisa dipakai)
4. Masuk dengan `admindesapekiknyaring` / `admindesa123`, lalu segera ganti
   kata sandi & isi `AUTH_SECRET` sendiri di Project Settings → Environment
   Variables

Jangan lupa isi `AUTH_SECRET` dengan teks acak panjang (mis. hasil
`openssl rand -hex 32`) di Settings → Environment Variables, lalu redeploy.

**Catatan penting**: filesystem Vercel bersifat sementara (serverless),
sehingga **data absensi pada mode Vercel bisa hilang kapan saja** — tabel &
akun admin dibuat otomatis saat server nyala (lihat
`src/lib/bootstrap-db.ts`), tetapi cocok hanya untuk **demo/ujicoba**, bukan
data resmi desa. Untuk data permanen gunakan Pilihan A (VPS), atau pindahkan
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
