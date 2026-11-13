import { useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, Globe, Loader2 } from 'lucide-react'
import { onboardingService } from '../../services/onboardingService'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

/**
 * SlugStep - Konfiguracja unikalnego sluga URL organizacji z weryfikacją na żywo.
 */
export function SlugStep({ slug, orgName, onSlugChange, onNext }) {
  const [internalSlug, setInternalSlug] = useState(
    slug || (orgName ? orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '')
  )
  const [isChecking, setIsChecking] = useState(false)
  const [status, setStatus] = useState(null) // { available: boolean, error?: string }

  const cleanSlug = (val) => {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-')
  }

  const handleChange = (e) => {
    const cleaned = cleanSlug(e.target.value)
    setInternalSlug(cleaned)
    onSlugChange(cleaned)
    setStatus(null)
  }

  const handleCheck = async (slugToCheck = internalSlug) => {
    const trimmed = slugToCheck.trim()
    if (!trimmed || trimmed.length < 2) {
      setStatus({ available: false, error: 'Slug musi mieć co najmniej 2 znaki' })
      return
    }

    setIsChecking(true)
    try {
      const res = await onboardingService.checkSlug(trimmed)
      setStatus({ available: res.available, error: res.available ? null : 'Ten identyfikator jest już zajęty' })
    } catch (err) {
      setStatus({ available: false, error: err?.message || 'Nie udało się zweryfikować identyfikatora' })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    const trimmed = internalSlug.trim()
    if (trimmed.length >= 2) {
      const timer = setTimeout(() => {
        void handleCheck(trimmed)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [internalSlug])

  const handleContinue = () => {
    if (status?.available) {
      onNext()
    } else {
      void handleCheck()
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-400 text-xs font-mono">
          <Globe className="w-3.5 h-3.5" />
          <span>Identyfikator organizacji</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Wybierz unikalny adres URL
        </h2>
        <p className="text-sm text-zinc-400">
          Będzie służyć do identyfikacji przestrzeni roboczej oraz generowania linków zgłoszeń.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
        <div className="space-y-2">
          <Label htmlFor="slug-input" className="text-xs font-medium text-zinc-300">
            Slug URL (identyfikator)
          </Label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs font-mono text-zinc-500 select-none">
              taskflow.pl/org/
            </span>
            <Input
              id="slug-input"
              autoFocus
              type="text"
              placeholder="nazwa-firmy"
              value={internalSlug}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleContinue()
                }
              }}
              className="h-11 pl-32 font-mono text-sm border-zinc-700 bg-zinc-950/80 focus-visible:ring-sky-500"
            />
            <div className="absolute right-3">
              {isChecking && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
              {!isChecking && status?.available && (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              )}
              {!isChecking && status && !status.available && (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
            </div>
          </div>
        </div>

        {/* Informacja zwrotna */}
        {status?.available && (
          <p className="text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Świetnie! Ten identyfikator jest wolny i gotowy do użycia.</span>
          </p>
        )}

        {status && !status.available && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{status.error || 'Identyfikator jest niedostępny'}</span>
          </p>
        )}

        <div className="pt-2">
          <Button
            type="button"
            onClick={handleContinue}
            disabled={isChecking || !internalSlug.trim() || status?.available === false}
            className="w-full h-11 gap-2 font-medium bg-sky-500 hover:bg-sky-400 text-zinc-950"
          >
            <span>Dalej</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
