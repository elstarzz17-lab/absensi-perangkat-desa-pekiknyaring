'use client'

import { useEffect, useState } from 'react'
import LoginView from '@/components/absensi/LoginView'
import AdminShell from '@/components/absensi/AdminShell'
import { LoaderCircle } from 'lucide-react'

export default function Home() {
  const [auth, setAuth] = useState<{ token: string; nama: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function cek() {
      const token = localStorage.getItem('absensi_token')
      const nama = localStorage.getItem('absensi_nama')
      if (token) {
        try {
          // Verifikasi token masih valid
          const r = await fetch('/api/perangkat', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (cancelled) return
          if (r.ok) {
            setAuth({ token, nama: nama || 'Admin Desa' })
          } else {
            localStorage.removeItem('absensi_token')
            localStorage.removeItem('absensi_nama')
          }
        } catch {
          // tetap tampilkan login
        } finally {
          if (!cancelled) setLoading(false)
        }
      } else {
        if (!cancelled) setLoading(false)
      }
    }
    const t = setTimeout(cek, 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-green-900 gap-4">
        <img src="/logo-kabupaten-bengkulu-tengah.png" alt="Logo Kabupaten Bengkulu Tengah" className="w-20 h-20 object-contain" />
        <div className="flex items-center gap-2 text-brand-gold-400">
          <LoaderCircle className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat sistem absensi...</span>
        </div>
      </div>
    )
  }

  if (!auth) {
    return (
      <LoginView
        onLogin={(token, nama) => {
          localStorage.setItem('absensi_token', token)
          localStorage.setItem('absensi_nama', nama)
          setAuth({ token, nama })
        }}
      />
    )
  }

  return (
    <AdminShell
      adminNama={auth.nama}
      onLogout={() => {
        localStorage.removeItem('absensi_token')
        localStorage.removeItem('absensi_nama')
        setAuth(null)
      }}
    />
  )
}
