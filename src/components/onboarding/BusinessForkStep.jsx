import { useState } from 'react'
import { Building, Check, KeyRound, Rocket, Users } from 'lucide-react'
import { Card } from '../ui/card'

/**
 * BusinessForkStep - Rozwidlenie ścieżki biznesowej:
 * 1. Dołącz do istniejącej firmy (posiadam kod TF-XXXXX)
 * 2. Stwórz nową organizację (jako administrator)
 *
 * Auto-advances po ~150ms micro-delay po kliknięciu.
 */
export function BusinessForkStep({ selectedFork, onSelectFork }) {
  const [activeChoice, setActiveChoice] = useState(selectedFork || null)

  const handleCardClick = (fork) => {
    setActiveChoice(fork)
    setTimeout(() => {
      onSelectFork(fork)
    }, 150)
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 text-xs font-mono">
          <span>Konto biznesowe</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Jak chcesz dołączyć do TaskFlow?
        </h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Możesz dołączyć do istniejącego zespołu za pomocą kodu zaproszenia lub stworzyć od zera nową firmę.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 pt-2">
        {/* 1. Dołącz do istniejącej firmy */}
        <Card
          tabIndex={0}
          role="button"
          aria-pressed={activeChoice === 'join'}
          onClick={() => handleCardClick('join')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleCardClick('join')
            }
          }}
          className={`group relative cursor-pointer overflow-hidden border p-5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            activeChoice === 'join'
              ? 'border-sky-500 bg-sky-950/20 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500'
              : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-900'
          }`}
        >
          {activeChoice === 'join' && (
            <div className="absolute right-3.5 top-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-zinc-950">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 transition-colors group-hover:scale-105">
              <KeyRound className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-zinc-100">Dołącz do firmy</span>
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                  Kod TF
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Posiadasz kod zaproszenia np. <code className="text-sky-300 font-mono">TF-A1B2C</code> od przełożonego? Wprowadź go, a administrator zatwierdzi Twoje konto.
              </p>
            </div>

            <div className="border-t border-zinc-800/80 pt-3 flex items-center gap-2 text-xs text-zinc-400">
              <Users className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span>Dla pracowników i współpracowników</span>
            </div>
          </div>
        </Card>

        {/* 2. Stwórz nową organizację */}
        <Card
          tabIndex={0}
          role="button"
          aria-pressed={activeChoice === 'create'}
          onClick={() => handleCardClick('create')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleCardClick('create')
            }
          }}
          className={`group relative cursor-pointer overflow-hidden border p-5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            activeChoice === 'create'
              ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
              : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-900'
          }`}
        >
          {activeChoice === 'create' && (
            <div className="absolute right-3.5 top-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 transition-colors group-hover:scale-105">
              <Rocket className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-zinc-100">Stwórz nową firmę</span>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                  Administrator
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Zarejestruj nową organizację, skonfiguruj subdomenę/slug, dodaj monitorowane aplikacje i zaproś swój zespół do współpracy.
              </p>
            </div>

            <div className="border-t border-zinc-800/80 pt-3 flex items-center gap-2 text-xs text-zinc-400">
              <Building className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Pełna przestrzeń dla Twojej firmy</span>
            </div>
          </div>
        </Card>
      </div>

      <p className="text-center text-xs text-zinc-500">
        Kliknij wybraną opcję, aby przejść dalej.
      </p>
    </div>
  )
}
