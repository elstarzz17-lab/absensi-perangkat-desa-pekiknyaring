'use client'

import { useState } from 'react'
import ScanView from './ScanView'
import DashboardView from './DashboardView'
import PerangkatView from './PerangkatView'
import RiwayatView from './RiwayatView'
import KartuQrView from './KartuQrView'
import { Button } from '@/components/ui/button'
import { SITE } from '@/lib/site-config'
import {
  ScanLine, LayoutDashboard, Users, History, QrCode, LogOut, Menu, X,
} from 'lucide-react'

interface AdminShellProps {
  adminNama: string
  onLogout: () => void
}

const MENU = [
  { id: 'scan', label: 'Scan QR', icon: ScanLine },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'perangkat', label: 'Data Perangkat', icon: Users },
  { id: 'riwayat', label: 'Riwayat Absensi', icon: History },
  { id: 'kartu', label: 'Kartu QR', icon: QrCode },
] as const

type MenuId = (typeof MENU)[number]['id']

export default function AdminShell({ adminNama, onLogout }: AdminShellProps) {
  const [menu, setMenu] = useState<MenuId>('scan')
  const [refreshToken, setRefreshToken] = useState(0)
  const [navOpen, setNavOpen] = useState(false)

  function pilihMenu(id: MenuId) {
    setMenu(id)
    setNavOpen(false)
    window.scrollTo({ top: 0 })
  }

  function mutasi() {
    setRefreshToken((v) => v + 1)
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      {/* HEADER */}
      <header className="bg-brand-green-900 text-white sticky top-0 z-40 shadow-lg shadow-brand-green-950/20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={SITE.logo}
                alt={`Logo ${SITE.kabupaten}`}
                className="w-9 h-9 object-contain shrink-0 drop-shadow"
              />
              <div className="min-w-0">
                <h1 className="font-bold text-sm sm:text-base leading-tight truncate">
                  Absensi Perangkat Desa
                  <span className="text-brand-gold-400"> {SITE.namaDesa}</span>
                </h1>
                <p className="text-[11px] text-brand-green-100/80 truncate">
                  Kec. {SITE.kecamatan} &bull; Kab. {SITE.kabupaten}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden md:block text-right mr-1">
                <p className="text-xs text-brand-green-100/70">Masuk sebagai</p>
                <p className="text-sm font-semibold text-brand-gold-400 leading-tight max-w-[220px] truncate">
                  {adminNama}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="border-brand-gold-500/60 text-brand-gold-400 hover:bg-brand-gold-500 hover:text-brand-green-950"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden border-brand-green-700 text-brand-green-100 hover:bg-brand-green-800"
                onClick={() => setNavOpen((v) => !v)}
                aria-label="Buka menu"
              >
                {navOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Navigasi desktop */}
          <nav className="hidden lg:flex gap-1 pb-2" aria-label="Menu utama">
            {MENU.map((m) => {
              const Icon = m.icon
              const aktif = menu === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => pilihMenu(m.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    aktif
                      ? 'bg-brand-gold-500 text-brand-green-950 shadow'
                      : 'text-brand-green-100 hover:bg-brand-green-800 hover:text-white'
                  }`}
                  aria-current={aktif ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {m.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Navigasi mobile */}
        {navOpen && (
          <nav className="lg:hidden border-t border-brand-green-800 px-4 py-2 space-y-1" aria-label="Menu utama mobile">
            {MENU.map((m) => {
              const Icon = m.icon
              const aktif = menu === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => pilihMenu(m.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    aktif
                      ? 'bg-brand-gold-500 text-brand-green-950'
                      : 'text-brand-green-100 hover:bg-brand-green-800'
                  }`}
                  aria-current={aktif ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {m.label}
                </button>
              )
            })}
          </nav>
        )}
      </header>

      {/* KONTEN */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {menu === 'scan' && <ScanView refreshToken={refreshToken} />}
        {menu === 'dashboard' && <DashboardView refreshToken={refreshToken} />}
        {menu === 'perangkat' && <PerangkatView refreshToken={refreshToken} onMutate={mutasi} />}
        {menu === 'riwayat' && <RiwayatView refreshToken={refreshToken} onMutate={mutasi} />}
        {menu === 'kartu' && <KartuQrView refreshToken={refreshToken} />}
      </main>

      {/* FOOTER */}
      <footer className="bg-brand-green-900 text-brand-green-100/80 print:hidden mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs">
          <p className="font-medium text-brand-gold-400/90">{SITE.pemerintahDesa}</p>
          <p className="mt-0.5">
            Kecamatan {SITE.kecamatan}, Kabupaten {SITE.kabupaten} &bull; Sistem Absensi QR Code &copy; {SITE.tahunHakCipta}
          </p>
        </div>
      </footer>
    </div>
  )
}
