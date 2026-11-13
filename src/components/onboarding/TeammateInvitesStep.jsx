import { useState } from 'react'
import { AlertCircle, ArrowRight, Mail, Plus, UserPlus, Users, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * TeammateInvitesStep - Opcjonalne zaproszenie współpracowników z opcją "Pomiń na razie".
 */
export function TeammateInvitesStep({ invites = [], onInvitesChange, onNext, onSkip }) {
  const [currentEmail, setCurrentEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)
  const [list, setList] = useState(invites || [])

  const handleAddEmail = () => {
    const trimmed = currentEmail.trim().toLowerCase()
    if (!trimmed) return

    if (!EMAIL_REGEX.test(trimmed)) {
      setErrorMsg('Wprowadź poprawny adres e-mail (np. anna@firma.pl)')
      return
    }

    if (list.includes(trimmed)) {
      setErrorMsg('Ten e-mail został już dodany do listy zaproszeń')
      return
    }

    const updated = [...list, trimmed]
    setList(updated)
    onInvitesChange(updated)
    setCurrentEmail('')
    setErrorMsg(null)
  }

  const handleRemove = (emailToRemove) => {
    const updated = list.filter((e) => e !== emailToRemove)
    setList(updated)
    onInvitesChange(updated)
  }

  const handleContinue = () => {
    onInvitesChange(list)
    onNext()
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-400 text-xs font-mono">
          <Users className="w-3.5 h-3.5" />
          <span>Zespół (opcjonalnie)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Zaproś pierwszych współpracowników
        </h2>
        <p className="text-sm text-zinc-400">
          Możesz wysłać zaproszenia teraz lub wygenerować kody zaproszeń w dowolnym momencie w panelu administracyjnym.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
        {/* Input e-maila */}
        <div className="space-y-2">
          <label htmlFor="invite-email-input" className="text-xs font-medium text-zinc-300">
            Adres e-mail współpracownika
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                id="invite-email-input"
                autoFocus
                type="email"
                placeholder="wspolpracownik@firma.pl"
                value={currentEmail}
                onChange={(e) => {
                  setCurrentEmail(e.target.value)
                  if (errorMsg) setErrorMsg(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddEmail()
                  }
                }}
                className="h-10 pl-9 border-zinc-700 bg-zinc-950/80 text-sm focus-visible:ring-sky-500"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddEmail}
              disabled={!currentEmail.trim()}
              className="gap-1.5 h-10 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            >
              <Plus className="h-4 w-4" />
              <span>Dodaj</span>
            </Button>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </p>
        )}

        {/* Lista dodanych adresów */}
        {list.length > 0 ? (
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Dodane zaproszenia ({list.length}):
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {list.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-300"
                >
                  <span className="font-mono text-zinc-200 truncate">{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(email)}
                    aria-label={`Usuń ${email}`}
                    className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800/80 bg-zinc-950/30 p-4 text-center">
            <UserPlus className="h-5 w-5 text-zinc-600 mx-auto mb-1.5" />
            <p className="text-xs text-zinc-500">
              Brak dodanych adresów. Możesz dodać je teraz lub pominąć ten krok.
            </p>
          </div>
        )}

        {/* Przyciski akcji */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            className="flex-1 h-11 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <span>Pomiń na razie</span>
          </Button>

          <Button
            type="button"
            onClick={handleContinue}
            className="flex-1 h-11 gap-2 font-medium bg-sky-500 hover:bg-sky-400 text-zinc-950"
          >
            <span>{list.length > 0 ? 'Kontynuuj z zaproszeniami' : 'Kontynuuj'}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
