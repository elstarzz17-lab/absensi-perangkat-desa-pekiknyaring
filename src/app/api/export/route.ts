import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { promisify } from 'util'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

const execFileAsync = promisify(execFile)

// GET: export rekap absensi ke Excel berwarna (.xlsx) dengan grid bulanan
// + ringkasan berwarna + grafik native — dibangun oleh scripts/export_excel.py (openpyxl)
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Tidak memiliki akses' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dari = searchParams.get('dari')
    const sampai = searchParams.get('sampai')

    const where: { tanggal?: { gte?: string; lte?: string } } = {}
    if (dari || sampai) {
      where.tanggal = {}
      if (dari) where.tanggal.gte = dari
      if (sampai) where.tanggal.lte = sampai
    }

    const [absensi, perangkat] = await Promise.all([
      db.absensi.findMany({
        where,
        include: { perangkat: true },
        orderBy: [{ tanggal: 'desc' }, { jamDatang: 'desc' }],
      }),
      db.perangkat.findMany({ orderBy: { id: 'asc' } }),
    ])

    // Payload untuk skrip Python (openpyxl)
    const payload = {
      dari,
      sampai,
      perangkat: perangkat.map((p) => ({
        id: p.id,
        nipd: p.nipd,
        nama: p.nama,
        nik: p.nik,
        jabatan: p.jabatan,
        jenisKelamin: p.jenisKelamin,
        pendidikan: p.pendidikan,
        nomorSk: p.nomorSk,
        status: p.status,
        keterangan: p.keterangan,
      })),
      absensi: absensi.map((a) => ({
        perangkatId: a.perangkatId,
        tanggal: a.tanggal,
        jamDatang: a.jamDatang,
        jamPulang: a.jamPulang,
        kategori: a.kategori,
        metode: a.metode,
        latitude: a.latitude,
        longitude: a.longitude,
        latPulang: a.latPulang,
        lonPulang: a.lonPulang,
        nipd: a.perangkat.nipd,
        nama: a.perangkat.nama,
        jabatan: a.perangkat.jabatan,
        status: a.perangkat.status,
      })),
    }

    const direktoriTmp = path.join(process.cwd(), '.export-tmp')
    await fs.mkdir(direktoriTmp, { recursive: true })
    const unik = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const filePayload = path.join(direktoriTmp, `payload-${unik}.json`)
    const fileXlsx = path.join(direktoriTmp, `rekap-${unik}.xlsx`)

    try {
      await fs.writeFile(filePayload, JSON.stringify(payload), 'utf8')
      await execFileAsync(
        'python3',
        [path.join(process.cwd(), 'scripts', 'export_excel.py'), filePayload, fileXlsx],
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
      )
      const buf = await fs.readFile(fileXlsx)

      const namaFile = `Rekap-Absensi-Desa-Pekik-Nyaring${dari ? `-${dari}` : ''}${sampai ? `-sd-${sampai}` : ''}.xlsx`
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${namaFile}"`,
        },
      })
    } finally {
      // Bersihkan berkas sementara (best-effort)
      fs.rm(filePayload).catch(() => {})
      fs.rm(fileXlsx).catch(() => {})
    }
  } catch (e) {
    console.error('Export error:', e)
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor data' },
      { status: 500 }
    )
  }
}
