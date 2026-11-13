import { useState } from 'react'
import { AlertCircle, Check, Eye, EyeOff, KeyRound, Loader2, Shield } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

function evaluatePasswordStrength(password) {
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasExtra = /[^A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(password) || password.length >= 12

  const score = [hasMinLength, hasUppercase, hasDigit, hasExtra].filter(Boolean).length

  let label = 'Bardzo słabe'
  let barColor = 'bg-red-500'
  let textColor = 'text-red-400'

  if (score === 2) {
    label = 'Średnie'
    barColor = 'bg-amber-500'
    textColor = 'text-amber-400'
  } else if (score === 3) {
    label = 'Dobre'
    barColor = 'bg-sky-500'
    textColor = 'text-sky-400'
  } else if (score === 4) {
    label = 'Silne'
    barColor = 'bg-emerald-500'
    textColor = 'text-emerald-400'
  }

  return {
    hasMinLength,
    hasUppercase,
    hasDigit,
    score,
    label,
    barColor,
    textColor,
  }
}

export function PasswordChangeForm() {
  const { changePassword } = useAuth()
  const { toast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [fieldErrors, setFieldErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const strength = evaluatePasswordStrength(newPassword)

  const validate = () => {
    const errors = {}

    if (!currentPassword) {
      errors.current_password = 'Podaj aktualne hasło.'
    }

    if (!newPassword) {
      errors.new_password = 'Podaj nowe hasło.'
    } else if (!strength.hasMinLength || !strength.hasUppercase || !strength.hasDigit) {
      errors.new_password =
        'Hasło musi mieć min. 8 znaków, co najmniej jedną wielką literę i jedną cyfrę.'
    } else if (newPassword === currentPassword) {
      errors.new_password = 'Nowe hasło musi różnić się od aktualnego.'
    }

    if (!confirmPassword) {
      errors.confirm_password = 'Potwierdź nowe hasło.'
    } else if (confirmPassword !== newPassword) {
      errors.confirm_password = 'Hasła nie są identyczne.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError(null)

    if (!validate()) return

    setIsSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrent(false)
      setShowNew(false)
      setShowConfirm(false)
      setFieldErrors({})
      toast({
        variant: 'success',
        title: 'Hasło zostało zmienione',
        description: 'Od teraz używaj nowego hasła przy logowaniu.',
      })
    } catch (error) {
      const message = error?.message || 'Nie udało się zmienić hasła.'
      setApiError(message)
      toast({
        variant: 'destructive',
        title: 'Błąd zmiany hasła',
        description: message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-sky-400" />
          <CardTitle className="text-base">Zmiana hasła</CardTitle>
        </div>
        <CardDescription>
          Zadbaj o bezpieczeństwo konta, używając silnego i unikalnego hasła.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {apiError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-red-800/70 bg-red-950/50 px-3 py-2.5 text-xs text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Aktualne hasło */}
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Aktualne hasło</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  if (fieldErrors.current_password) {
                    setFieldErrors((prev) => ({ ...prev, current_password: undefined }))
                  }
                  if (apiError) setApiError(null)
                }}
                disabled={isSaving}
                placeholder="Wpisz aktualne hasło"
                className={cn('pr-10', fieldErrors.current_password && 'border-red-700')}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Ukryj aktualne hasło' : 'Pokaż aktualne hasło'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.current_password && (
              <p className="text-xs text-red-400">{fieldErrors.current_password}</p>
            )}
          </div>

          {/* Nowe hasło */}
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nowe hasło</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (fieldErrors.new_password) {
                    setFieldErrors((prev) => ({ ...prev, new_password: undefined }))
                  }
                  if (apiError) setApiError(null)
                }}
                disabled={isSaving}
                placeholder="Minimum 8 znaków"
                className={cn('pr-10', fieldErrors.new_password && 'border-red-700')}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'Ukryj nowe hasło' : 'Pokaż nowe hasło'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.new_password && (
              <p className="text-xs text-red-400">{fieldErrors.new_password}</p>
            )}

            {/* Wskaźnik siły hasła */}
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Siła hasła</span>
                <span className={cn('font-medium', newPassword ? strength.textColor : 'text-zinc-500')}>
                  {newPassword ? strength.label : 'Nie podano'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={cn(
                      'h-1.5 rounded-full transition-colors',
                      newPassword && strength.score >= step ? strength.barColor : 'bg-zinc-800'
                    )}
                  />
                ))}
              </div>
              <ul className="space-y-1 text-[11px]">
                <li
                  className={cn(
                    'flex items-center gap-1.5',
                    strength.hasMinLength ? 'text-emerald-400' : 'text-zinc-500'
                  )}
                >
                  <Check className="h-3 w-3 shrink-0" />
                  <span>Co najmniej 8 znaków</span>
                </li>
                <li
                  className={cn(
                    'flex items-center gap-1.5',
                    strength.hasUppercase ? 'text-emerald-400' : 'text-zinc-500'
                  )}
                >
                  <Check className="h-3 w-3 shrink-0" />
                  <span>Co najmniej jedna wielka litera</span>
                </li>
                <li
                  className={cn(
                    'flex items-center gap-1.5',
                    strength.hasDigit ? 'text-emerald-400' : 'text-zinc-500'
                  )}
                >
                  <Check className="h-3 w-3 shrink-0" />
                  <span>Co najmniej jedna cyfra</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Potwierdź nowe hasło */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Powtórz nowe hasło</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (fieldErrors.confirm_password) {
                    setFieldErrors((prev) => ({ ...prev, confirm_password: undefined }))
                  }
                }}
                disabled={isSaving}
                placeholder="Powtórz nowe hasło"
                className={cn('pr-10', fieldErrors.confirm_password && 'border-red-700')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Ukryj powtórzone hasło' : 'Pokaż powtórzone hasło'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirm_password && (
              <p className="text-xs text-red-400">{fieldErrors.confirm_password}</p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aktualizowanie...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Zmień hasło
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
