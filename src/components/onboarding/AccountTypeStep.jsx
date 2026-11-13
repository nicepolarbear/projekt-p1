import { useState } from 'react'
import { Building2, Check, CheckCircle2, ShieldCheck, Sparkles, User } from 'lucide-react'
import { Card } from '../ui/card'

/**
 * AccountTypeStep - Wybór profilu użytkownika:
 * - 👤 Zwykły użytkownik (indywidualny reporter błędów)
 * - 🏢 Konto biznesowe (organizacja, projekty, zespół)
 *
 * Kliknięcie karty natychmiast zaznacza opcję i po ~150ms micro-delay
 * automatycznie przechodzi do kolejnego kroku.
 */
export function AccountTypeStep({ selectedType, onSelectType }) {
  const [activeChoice, setActiveChoice] = useState(selectedType || null)

  const handleCardClick = (type) => {
    setActiveChoice(type)
    setTimeout(() => {
      onSelectType(type)
    }, 150)
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Nagłówek pytania */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-400 text-xs font-mono">
          <span>Krok 1: Profil konta</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Jak zamierzasz korzystać z TaskFlow?
        </h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Dostosujemy interfejs, moduły oraz uprawnienia do Twojej roli.
        </p>
      </div>

      {/* Karty wyboru konta */}
      <div className="grid gap-4 sm:grid-cols-2 pt-2">
        {/* 1. Zwykły użytkownik */}
        <Card
          tabIndex={0}
          role="button"
          aria-pressed={activeChoice === 'individual'}
          onClick={() => handleCardClick('individual')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleCardClick('individual')
            }
          }}
          className={`group relative cursor-pointer overflow-hidden border p-5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            activeChoice === 'individual'
              ? 'border-sky-500 bg-sky-950/20 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500'
              : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-900'
          }`}
        >
          {activeChoice === 'individual' && (
            <div className="absolute right-3.5 top-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-zinc-950">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 transition-colors group-hover:scale-105">
              <User className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-zinc-100">Zwykły użytkownik</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                  Osobiste
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Zgłaszaj błędy, monitoruj status swoich zgłoszeń i weryfikuj poprawki bez konieczności zarządzania firmą.
              </p>
            </div>

            <ul className="space-y-2 border-t border-zinc-800/80 pt-3 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                <span>Portal zgłaszania i śledzenia błędów</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                <span>Powiadomienia o zmianie statusu zgłoszeń</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                <span>Dostęp do publicznych aplikacji</span>
              </li>
            </ul>
          </div>
        </Card>

        {/* 2. Konto biznesowe */}
        <Card
          tabIndex={0}
          role="button"
          aria-pressed={activeChoice === 'business'}
          onClick={() => handleCardClick('business')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleCardClick('business')
            }
          }}
          className={`group relative cursor-pointer overflow-hidden border p-5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            activeChoice === 'business'
              ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
              : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-900'
          }`}
        >
          {activeChoice === 'business' && (
            <div className="absolute right-3.5 top-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 transition-colors group-hover:scale-105">
              <Building2 className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-zinc-100">Konto biznesowe</span>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300 uppercase tracking-wider">
                  Zespołowe
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dla firm, liderów technicznych i zespołów deweloperskich. Pełna tablica Kanban, role RBAC i konwersja błędów na zadania.
              </p>
            </div>

            <ul className="space-y-2 border-t border-zinc-800/80 pt-3 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Zaawansowane role (Admin, Dyrektor, Kierownik)</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Konwersja zgłoszeń bugów na zadania Kanban</span>
              </li>
              <li className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Rejestracja nowej firmy lub dołączenie z kodem</span>
              </li>
            </ul>
          </div>
        </Card>
      </div>

      <p className="text-center text-xs text-zinc-500">
        Kliknij wybraną kartę, aby przejść dalej.
      </p>
    </div>
  )
}
