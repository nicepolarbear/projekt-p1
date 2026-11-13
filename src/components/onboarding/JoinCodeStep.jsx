import { useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, Building, CheckCircle2, KeyRound, Loader2 } from 'lucide-react'
import { onboardingService } from '../../services/onboardingService'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

/**
 * JoinCodeStep - Wprowadzenie i weryfikacja kodu zaproszenia do firmy (np. TF-XXXXX).
 */
export function JoinCodeStep({ code, onCodeChange, onValidVerified, onNext }) {
  const [internalCode, setInternalCode] = useState(code || '')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  // Format code on change (e.g. ensure uppercase)
  const handleChange = (e) => {
    const val = e.target.value.toUpperCase()
    setInternalCode(val)
    onCodeChange(val)
    setErrorMsg(null)
    setVerificationResult(null)
  }

  // Weryfikacja kodu z API
  const handleVerify = useCallback(async (codeToVerify = internalCode) => {
    const trimmed = (codeToVerify || '').trim()
    if (!trimmed) {
      setErrorMsg('Wprowadź kod zaproszenia')
      return
    }

    setIsVerifying(true)
    setErrorMsg(null)
    try {
      const res = await onboardingService.verifyJoinCode(trimmed)
      setVerificationResult(res)
      if (onValidVerified) {
        onValidVerified(res)
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Nieprawidłowy lub wygasły kod zaproszenia.')
      setVerificationResult(null)
    } finally {
      setIsVerifying(false)
    }
  }, [internalCode, onValidVerified])

  // Auto-verify if code length looks full (e.g. TF-XXXX or 6+ chars)
  useEffect(() => {
    const trimmed = (internalCode || '').trim()
    if (trimmed.length >= 6 && !verificationResult && !isVerifying) {
      const timer = setTimeout(() => {
        void handleVerify(trimmed)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [internalCode, verificationResult, isVerifying, handleVerify])

  const handleContinue = () => {
    if (verificationResult?.valid) {
      onNext()
    } else {
      void handleVerify()
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-400 text-xs font-mono">
          <KeyRound className="w-3.5 h-3.5" />
          <span>Weryfikacja organizacji</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Wprowadź kod zaproszenia
        </h2>
        <p className="text-sm text-zinc-400">
          Unikalny kod przekazany przez administratora Twojej organizacji (format: <code className="text-sky-300 font-mono">TF-XXXXX</code>).
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
        <div className="space-y-2">
          <Label htmlFor="join-code-input" className="text-xs font-medium text-zinc-300">
            Kod zaproszenia
          </Label>
          <div className="relative flex items-center">
            <Input
              id="join-code-input"
              autoFocus
              type="text"
              placeholder="TF-ABC12"
              value={internalCode}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleContinue()
                }
              }}
              className="h-12 text-center text-lg font-mono tracking-widest uppercase border-zinc-700 bg-zinc-950/80 focus-visible:ring-sky-500"
            />
          </div>
        </div>

        {/* Błąd weryfikacji */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-900/70 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Sukces weryfikacji */}
        {verificationResult && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3.5 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-emerald-100 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-emerald-400" />
                <span>Organizacja rozpoznana: {verificationResult.organization?.name}</span>
              </div>
              <p className="text-emerald-300/90">
                Sugerowane stanowisko:{' '}
                <span className="font-medium text-white">
                  {verificationResult.suggested_position || 'Standardowy pracownik'}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Przycisk akcji */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={handleContinue}
            disabled={isVerifying || !internalCode.trim()}
            className="w-full h-11 gap-2 font-medium bg-sky-500 hover:bg-sky-400 text-zinc-950"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Weryfikacja kodu...</span>
              </>
            ) : verificationResult?.valid ? (
              <>
                <span>Kontynuuj rejestrację</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Sprawdź kod i przejdź dalej</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
