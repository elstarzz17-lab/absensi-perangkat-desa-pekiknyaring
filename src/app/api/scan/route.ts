import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { getTanggalJakarta, getJamJakarta } from '@/lib/waktu'

// Proteksi double-scan: jarak minimal antar scan untuk perangkat AKTIF (detik)
const MIN_INTERVAL_SCAN_PULANG = 30 // detik

/** Validasi & rapikan payload lokasi GPS dari klien (null bila tidak sah). */
function parseLokasi(
  mentah: unknown
): { latitude: number; longitude: number; akurasi: number | null } | null {
  if (!mentah || typeof mentah !== 'object') return null
  const l = mentah as { latitude?: unknown; longitude?: unknown; akurasi?: unknown }
  const lat = Number(l.latitude)
  const lon = Number(l.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  const ak = Number(l.akurasi)
  return {
    latitude: lat,
    longitude: lon,
    akurasi: Number.isFinite(ak) && ak >= 0 && ak < 100000 ? ak : null,
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Tidak memiliki akses. Silakan login.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const codeRaw: string = (body.code ?? '').toString().trim()
    const metode: string = body.metode === 'MANUAL' ? 'MANUAL' : 'SCAN'
    const lokasi = parseLokasi(body.lokasi)
    // Mode absen eksplisit dari UI: 'DATANG' | 'PULANG'. Bila tidak dikirim
    // (klien lama), sistem memakai mode OTOMATIS: scan pertama = datang,
    // scan kedua = pulang (AKTIF) / hanya datang (PASIF).
    const tipeAbsen: 'DATANG' | 'PULANG' | null =
      body.tipe === 'DATANG' || body.tipe === 'PULANG' ? body.tipe : null

    if (!codeRaw) {
      return NextResponse.json(
        { success: false, message: 'Kode absensi kosong' },
        { status: 400 }
      )
    }

    // Kode bisa berupa NIK (16 digit) atau NIPD-XXX
    const code = codeRaw.toUpperCase()

    const perangkat = await db.perangkat.findFirst({
      where: { OR: [{ nik: code }, { nipd: code }] },
    })

    if (!perangkat) {
      return NextResponse.json(
        {
          success: false,
          tipe: 'TIDAK_DIKENAL',
          message: `Kode "${codeRaw}" tidak dikenali. Bukan NIK/NIPD perangkat desa manapun.`,
        },
        { status: 404 }
      )
    }

    const tanggal = getTanggalJakarta()
    const jam = getJamJakarta()
    const existing = await db.absensi.findUnique({
      where: { perangkatId_tanggal: { perangkatId: perangkat.id, tanggal } },
    })

    // ====== MODE EKSPLISIT: ABSEN DATANG (semua perangkat, AKTIF & PASIF) ======
    if (tipeAbsen === 'DATANG') {
      if (existing) {
        return NextResponse.json({
          success: true,
          tipe: 'SUDAH_DATANG',
          message: `${perangkat.nama} sudah absen datang hari ini pukul ${existing.jamDatang?.slice(0, 5)} WIB.`,
          data: existing,
        })
      }
      const absensi = await db.absensi.create({
        data: {
          perangkatId: perangkat.id,
          tanggal,
          jamDatang: jam,
          kategori: perangkat.status,
          metode,
          latitude: lokasi?.latitude,
          longitude: lokasi?.longitude,
          akurasi: lokasi?.akurasi,
        },
        include: { perangkat: true },
      })
      return NextResponse.json({
        success: true,
        tipe: 'DATANG',
        message: 'Absen DATANG tercatat. Sampai jumpa saat absen pulang!',
        data: absensi,
      })
    }

    // ====== MODE EKSPLISIT: ABSEN PULANG (semua perangkat, AKTIF & PASIF) ======
    if (tipeAbsen === 'PULANG') {
      if (!existing) {
        return NextResponse.json({
          success: true,
          tipe: 'BELUM_DATANG',
          message: `${perangkat.nama} belum absen DATANG hari ini. Gunakan mode Absen Datang terlebih dahulu.`,
        })
      }
      if (existing.jamPulang) {
        return NextResponse.json({
          success: true,
          tipe: 'SUDAH_LENGKAP',
          message: `${perangkat.nama} sudah absen datang & pulang hari ini.`,
          data: existing,
        })
      }
      // Proteksi scan kembar: absen pulang minimal 30 detik setelah absen datang
      const createdAtMs = new Date(existing.createdAt).getTime()
      const selisihDetik = (Date.now() - createdAtMs) / 1000
      if (selisihDetik < MIN_INTERVAL_SCAN_PULANG) {
        return NextResponse.json({
          success: true,
          tipe: 'DUPLIKAT',
          message: `${perangkat.nama} baru saja absen datang (${Math.ceil(
            MIN_INTERVAL_SCAN_PULANG - selisihDetik
          )} detik lagi boleh absen pulang).`,
          data: existing,
        })
      }
      const absensi = await db.absensi.update({
        where: { id: existing.id },
        data: {
          jamPulang: jam,
          latPulang: lokasi?.latitude,
          lonPulang: lokasi?.longitude,
          akurasiPulang: lokasi?.akurasi,
        },
        include: { perangkat: true },
      })
      return NextResponse.json({
        success: true,
        tipe: 'PULANG',
        message: 'Absen PULANG tercatat. Hati-hati di jalan!',
        data: absensi,
      })
    }

    // ====== MODE OTOMATIS (klien lama): scan 1 = datang, scan 2 = pulang (AKTIF) ======
    // 1) Belum ada absensi hari ini -> catat JAM DATANG
    if (!existing) {
      const absensi = await db.absensi.create({
        data: {
          perangkatId: perangkat.id,
          tanggal,
          jamDatang: jam,
          kategori: perangkat.status,
          metode,
          latitude: lokasi?.latitude,
          longitude: lokasi?.longitude,
          akurasi: lokasi?.akurasi,
        },
        include: { perangkat: true },
      })
      return NextResponse.json({
        success: true,
        tipe: 'DATANG',
        message:
          perangkat.status === 'PASIF'
            ? `Absen datang tercatat (status PASIF — hanya catat datang)`
            : `Absen datang tercatat. Jangan lupa scan lagi saat pulang!`,
        data: absensi,
      })
    }

    // 2) Sudah ada & belum ada jam pulang (mode otomatis)
    if (existing && !existing.jamPulang) {
      if (perangkat.status === 'PASIF') {
        // Status PASIF: hanya catat datang
        return NextResponse.json({
          success: true,
          tipe: 'SUDAH_DATANG',
          message: `${perangkat.nama} sudah absen datang hari ini (status PASIF — tanpa absen pulang).`,
          data: existing,
        })
      }

      // Status AKTIF: scan kedua = absen pulang (dengan proteksi double-scan)
      const createdAtMs = new Date(existing.createdAt).getTime()
      const selisihDetik = (Date.now() - createdAtMs) / 1000
      if (selisihDetik < MIN_INTERVAL_SCAN_PULANG) {
        return NextResponse.json({
          success: true,
          tipe: 'DUPLIKAT',
          message: `${perangkat.nama} baru saja scan (${Math.ceil(
            MIN_INTERVAL_SCAN_PULANG - selisihDetik
          )} detik lagi boleh scan pulang).`,
          data: existing,
        })
      }

      const absensi = await db.absensi.update({
        where: { id: existing.id },
        data: {
          jamPulang: jam,
          latPulang: lokasi?.latitude,
          lonPulang: lokasi?.longitude,
          akurasiPulang: lokasi?.akurasi,
        },
        include: { perangkat: true },
      })
      return NextResponse.json({
        success: true,
        tipe: 'PULANG',
        message: `Absen pulang tercatat. Hati-hati di jalan!`,
        data: absensi,
      })
    }

    // 3) Sudah lengkap datang + pulang (mode otomatis)
    return NextResponse.json({
      success: true,
      tipe: 'SUDAH_LENGKAP',
      message: `${perangkat.nama} sudah absen datang & pulang hari ini.`,
      data: existing,
    })
  } catch (e) {
    console.error('Scan error:', e)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
