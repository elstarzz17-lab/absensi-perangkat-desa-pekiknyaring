'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Lock, LogIn, Eye, EyeOff, ShieldCheck, LoaderCircle } from 'lucide-react'
import { SITE, ALAMAT_SINGKAT } from '@/lib/site-config'

interface LoginViewProps {
  onLogin: (token: string, nama: string) => void
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json()
      if (json.success) {
        onLogin(json.token, json.admin.nama)
      } else {
        setError(json.message || 'Login gagal')
      }
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-green-900 relative overflow-hidden px-4 py-10">
      {/* Dekorasi latar */}
      <div className="absolute inset-0 opacity-[0.06]" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-gold-400" />
        <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-brand-gold-400" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-brand-green-500" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Identitas resmi */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white p-[3px] shadow-xl shadow-black/30 mb-4">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
              <img
                src={SITE.logo}
                alt={`Logo ${SITE.kabupaten}`}
                className="w-20 h-24 object-contain"
              />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-gold-100 tracking-wide">
            SISTEM ABSENSI PERANGKAT DESA
          </h1>
          <p className="mt-1 text-sm text-brand-green-100/90 font-medium">
            {ALAMAT_SINGKAT}
          </p>
          <p className="text-xs text-brand-green-100/70">
            Kabupaten {SITE.kabupaten}
          </p>
        </div>

        <Card className="border-brand-gold-500/40 shadow-2xl shadow-black/40 bg-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6 text-brand-green-800">
              <ShieldCheck className="w-5 h-5 text-brand-gold-600" />
              <h2 className="font-semibold text-lg">Masuk sebagai Admin</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-brand-green-900">Nama Pengguna</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-green-700" />
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Masukkan nama pengguna"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 border-brand-green-100 focus-visible:ring-brand-green-600"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-brand-green-900">Kata Sandi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-green-700" />
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 border-brand-green-100 focus-visible:ring-brand-green-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-green-700 hover:text-brand-green-900"
                    aria-label={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-brand-green-800 hover:bg-brand-green-700 text-white font-semibold text-base"
              >
                {loading ? (
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Masuk
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-brand-green-100/60 mt-6">
          Hanya administrator desa yang memiliki akses ke sistem ini.
        </p>
      </div>
    </div>
  )
}
