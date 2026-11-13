import { useState } from 'react'
import { AlertCircle, AlertTriangle, Bug, Eye, EyeOff, Layers, Loader2, LogIn } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { DemoCredentialsCard } from './DemoCredentialsCard'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage({ onOpenOnboarding, onOpenBugReport, onOpenTracker } = {}) {
  const { login, sessionExpiredMessage } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const nextErrors = {}
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      nextErrors.email = 'Adres e-mail jest wymagany.'
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = 'Podaj prawidłowy adres e-mail.'
    }

    if (!password) {
      nextErrors.password = 'Hasło jest wymagane.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError(null)

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (error) {
      setApiError(error?.message || 'Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setFieldErrors({})
    setApiError(null)
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-950 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Card className="overflow-hidden border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-md">
          {/* Pasek okienkowy w stylu macOS */}
          <div className="flex items-center justify-between border-b border-zinc-800/90 bg-zinc-950/60 px-4 py-2.5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            </div>
            <span className="text-[11px] font-medium text-zinc-500">TaskFlow • Autoryzacja</span>
            <div className="w-9" />
          </div>

          <CardHeader className="space-y-3 pb-4 pt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-800/80 shadow-inner">
              <Layers className="h-6 w-6 text-sky-400" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl tracking-tight text-zinc-100">
                Zaloguj się do TaskFlow
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Wprowadź swoje dane służbowe, aby przejść do pulpitu zadań.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {sessionExpiredMessage && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-lg border border-amber-800/70 bg-amber-950/40 px-3.5 py-2.5 text-xs text-amber-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span className="leading-relaxed">{sessionExpiredMessage}</span>
              </div>
            )}

            {apiError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-800/70 bg-red-950/50 px-3.5 py-2.5 text-xs text-red-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span className="leading-relaxed">{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Adres e-mail</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="imie.nazwisko@firma.pl"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }))
                    }
                    if (apiError) setApiError(null)
                  }}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={cn(
                    fieldErrors.email && 'border-red-700 focus-visible:ring-red-600'
                  )}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-400">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password">Hasło</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Wpisz hasło"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }))
                      }
                      if (apiError) setApiError(null)
                    }}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.password)}
                    className={cn(
                      'pr-10',
                      fieldErrors.password && 'border-red-700 focus-visible:ring-red-600'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-zinc-200 disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-400">{fieldErrors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2 font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logowanie...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Zaloguj się
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/80 text-center">
              {onOpenOnboarding && (
                <button
                  type="button"
                  onClick={onOpenOnboarding}
                  className="text-xs text-sky-400 hover:text-sky-300 hover:underline transition-colors font-medium py-1"
                >
                  Nie masz jeszcze konta? Rozpocznij wdrożenie krok-po-kroku →
                </button>
              )}
              {onOpenBugReport && (
                <button
                  type="button"
                  onClick={onOpenBugReport}
                  className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors py-1 flex items-center justify-center gap-1.5"
                >
                  <span>Chcesz tylko zgłosić usterkę?</span>
                  <span className="text-emerald-400 font-medium">Zgłoś błąd bez logowania →</span>
                </button>
              )}
              {onOpenTracker && (
                <button
                  type="button"
                  onClick={onOpenTracker}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors py-1 flex items-center justify-center gap-1.5"
                >
                  <Bug className="h-3.5 w-3.5" />
                  <span>Śledź status zgłoszenia (kod BUG-XXXX) →</span>
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <DemoCredentialsCard
          selectedEmail={email}
          onSelectAccount={handleSelectDemoAccount}
        />
      </div>
    </div>
  )
}
