import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Globe,
  Mail,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

/**
 * OneInputStep - Uniwersalny pojedynczy ekran pytania:
 * Obsługuje:
 * - 'text' (np. Imię, Nazwa firmy, Aplikacja)
 * - 'email' (z walidacją i opcjonalnymi pills demonstracyjnymi)
 * - 'name_pair' (Imię i Nazwisko w jednym spójnym pytaniu)
 * - 'password' (z podglądem oka i wskaźnikiem siły)
 */
export function OneInputStep({
  badge,
  badgeIcon: BadgeIcon,
  title,
  subtitle,
  type = 'text',
  placeholder,
  value,
  secondaryValue,
  secondaryPlaceholder,
  secondaryLabel,
  onChange,
  onSecondaryChange,
  onNext,
  demoAccounts = [],
  onSelectDemoAccount,
  isSubmitting = false,
  submitLabel = 'Dalej',
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const validateAndAdvance = () => {
    setErrorMsg(null)
    const primary = (value || '').trim()

    if (type === 'name_pair') {
      const first = (value || '').trim()
      const last = (secondaryValue || '').trim()
      if (!first) {
        setErrorMsg('Podaj imię')
        return
      }
      if (!last) {
        setErrorMsg('Podaj nazwisko')
        return
      }
      onNext()
      return
    }

    if (!primary) {
      setErrorMsg('To pole jest wymagane')
      return
    }

    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(primary)) {
        setErrorMsg('Wprowadź prawidłowy adres e-mail (np. jan.kowalski@firma.pl)')
        return
      }
    }

    if (type === 'password') {
      if (primary.length < 8) {
        setErrorMsg('Hasło musi mieć co najmniej 8 znaków')
        return
      }
    }

    onNext()
  }

  // Obliczenie siły hasła
  const getPasswordStrength = (pwd = '') => {
    let score = 0
    if (pwd.length >= 8) score += 1
    if (pwd.length >= 12) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1
    return score // 0 - 5
  }

  const pwdScore = type === 'password' ? getPasswordStrength(value) : 0

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Nagłówek pytania */}
      <div className="text-center space-y-2">
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-400 text-xs font-mono">
            {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5" />}
            <span>{badge}</span>
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
      </div>

      {/* Kontener pytania */}
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
        {/* Wariant: Imię i Nazwisko (name_pair) */}
        {type === 'name_pair' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="first-name-input" className="text-xs font-medium text-zinc-300">
                Imię
              </Label>
              <Input
                id="first-name-input"
                autoFocus
                type="text"
                placeholder="np. Anna"
                value={value || ''}
                onChange={(e) => {
                  onChange(e.target.value)
                  if (errorMsg) setErrorMsg(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    validateAndAdvance()
                  }
                }}
                className="h-11 border-zinc-700 bg-zinc-950/80 text-sm focus-visible:ring-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last-name-input" className="text-xs font-medium text-zinc-300">
                Nazwisko
              </Label>
              <Input
                id="last-name-input"
                type="text"
                placeholder="np. Kowalska"
                value={secondaryValue || ''}
                onChange={(e) => {
                  if (onSecondaryChange) onSecondaryChange(e.target.value)
                  if (errorMsg) setErrorMsg(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    validateAndAdvance()
                  }
                }}
                className="h-11 border-zinc-700 bg-zinc-950/80 text-sm focus-visible:ring-sky-500"
              />
            </div>
          </div>
        ) : type === 'password' ? (
          /* Wariant: Hasło */
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="password-input"
                autoFocus
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={placeholder || 'Wprowadź hasło (min. 8 znaków)'}
                value={value || ''}
                onChange={(e) => {
                  onChange(e.target.value)
                  if (errorMsg) setErrorMsg(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    validateAndAdvance()
                  }
                }}
                className="h-11 pr-11 border-zinc-700 bg-zinc-950/80 text-sm focus-visible:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Wskaźnik siły hasła */}
            {value && (
              <div className="space-y-1.5 pt-1">
                <div className="flex gap-1 h-1.5">
                  <div
                    className={`flex-1 rounded-full transition-colors ${
                      pwdScore >= 1 ? 'bg-red-500' : 'bg-zinc-800'
                    }`}
                  />
                  <div
                    className={`flex-1 rounded-full transition-colors ${
                      pwdScore >= 2 ? 'bg-amber-500' : 'bg-zinc-800'
                    }`}
                  />
                  <div
                    className={`flex-1 rounded-full transition-colors ${
                      pwdScore >= 3 ? 'bg-sky-500' : 'bg-zinc-800'
                    }`}
                  />
                  <div
                    className={`flex-1 rounded-full transition-colors ${
                      pwdScore >= 4 ? 'bg-emerald-500' : 'bg-zinc-800'
                    }`}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-zinc-400">
                  <span>
                    Siła hasła:{' '}
                    {pwdScore <= 1
                      ? 'Słabe'
                      : pwdScore <= 2
                      ? 'Umiarkowane'
                      : pwdScore <= 3
                      ? 'Dobre'
                      : 'Bardzo silne'}
                  </span>
                  <span>Min. 8 znaków</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Wariant standardowy text / email */
          <div className="space-y-3">
            <div className="relative">
              {type === 'email' && (
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              )}
              <Input
                id="single-input"
                autoFocus
                type={type === 'email' ? 'email' : 'text'}
                placeholder={placeholder}
                value={value || ''}
                onChange={(e) => {
                  onChange(e.target.value)
                  if (errorMsg) setErrorMsg(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    validateAndAdvance()
                  }
                }}
                className={`h-11 border-zinc-700 bg-zinc-950/80 text-sm focus-visible:ring-sky-500 ${
                  type === 'email' ? 'pl-9' : ''
                }`}
              />
            </div>

            {/* Opcjonalne pole pomocnicze (np. URL aplikacji) */}
            {secondaryLabel && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="secondary-input" className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{secondaryLabel}</span>
                </Label>
                <Input
                  id="secondary-input"
                  type="text"
                  placeholder={secondaryPlaceholder || 'https://...'}
                  value={secondaryValue || ''}
                  onChange={(e) => {
                    if (onSecondaryChange) onSecondaryChange(e.target.value)
                    if (errorMsg) setErrorMsg(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      validateAndAdvance()
                    }
                  }}
                  className="h-10 border-zinc-700 bg-zinc-950/80 text-sm font-mono text-zinc-300 focus-visible:ring-sky-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Komunikat o błędzie walidacji */}
        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Demo konta dla logowania */}
        {demoAccounts && demoAccounts.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="text-[11px] font-medium text-zinc-400">
              Konta demonstracyjne do szybkiego testowania:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  type="button"
                  key={acc.email}
                  onClick={() => onSelectDemoAccount && onSelectDemoAccount(acc)}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-2 text-left hover:border-zinc-700 hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-200 truncate">{acc.label}</div>
                    <div className="text-[10px] font-mono text-zinc-400 truncate">{acc.email}</div>
                  </div>
                  {value === acc.email && <Check className="h-3.5 w-3.5 text-sky-400 shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Przycisk akcji */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={validateAndAdvance}
            disabled={isSubmitting}
            className="w-full h-11 gap-2 font-medium bg-sky-500 hover:bg-sky-400 text-zinc-950"
          >
            <span>{submitLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-center">
        <span className="text-[11px] text-zinc-500 font-mono">Naciśnij [Enter ↵] aby zatwierdzić</span>
      </div>
    </div>
  )
}
