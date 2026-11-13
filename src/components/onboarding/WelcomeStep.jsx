import { ArrowRight, Bug, Layers, LogIn, Sparkles, UserPlus } from 'lucide-react'
import { Card } from '../ui/card'

/**
 * WelcomeStep - Ekran powitalny TaskFlow.
 * Umożliwia wybór:
 * 1. Stworzenie nowego konta (start kreatora)
 * 2. Zalogowanie się (widok 1-pytanie-na-ekran)
 * 3. Zgłoszenie błędu jako Gość (bez logowania)
 */
export function WelcomeStep({ onSelectChoice }) {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Nagłówek powitalny */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-medium tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Inteligentna platforma zarządzania projektami i zgłoszeniami</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
            Witaj w <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">TaskFlow</span>
          </h1>
        </div>

        <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Wszystkie zadania zespołu, monitoring aplikacji oraz zgłoszenia błędów w jednym przejrzystym miejscu.
        </p>
      </div>

      {/* Karty wyboru */}
      <div className="grid gap-3.5 sm:grid-cols-1 pt-2">
        {/* 1. Stwórz nowe konto */}
        <Card
          onClick={() => onSelectChoice('register')}
          className="group relative cursor-pointer overflow-hidden border-zinc-800/90 bg-zinc-900/80 p-5 transition-all duration-200 hover:border-sky-500/50 hover:bg-zinc-900 hover:shadow-xl hover:shadow-sky-500/10 active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 transition-colors group-hover:bg-sky-500 group-hover:text-white">
              <UserPlus className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1 space-y-1 text-left">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-zinc-100 group-hover:text-white">
                  Stwórz nowe konto
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 group-hover:translate-x-0.5 transition-transform">
                  Rozpocznij <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-normal">
                Zarejestruj konto indywidualnego zgłaszającego lub załóż nową organizację dla swojego zespołu.
              </p>
            </div>
          </div>
        </Card>

        {/* 2. Zaloguj się */}
        <Card
          onClick={() => onSelectChoice('login')}
          className="group relative cursor-pointer overflow-hidden border-zinc-800/90 bg-zinc-900/80 p-5 transition-all duration-200 hover:border-indigo-500/50 hover:bg-zinc-900 hover:shadow-xl hover:shadow-indigo-500/10 active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 transition-colors group-hover:bg-indigo-500 group-hover:text-white">
              <LogIn className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1 space-y-1 text-left">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-zinc-100 group-hover:text-white">
                  Zaloguj się do konta
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                  Logowanie <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-normal">
                Przejdź do szybkiego logowania krok-po-kroku lub wybierz gotowe konto demonstracyjne do testów.
              </p>
            </div>
          </div>
        </Card>

        {/* 3. Zgłoś błąd bez logowania */}
        <Card
          onClick={() => onSelectChoice('guest_bug')}
          className="group relative cursor-pointer overflow-hidden border-zinc-800/90 bg-zinc-900/60 p-5 transition-all duration-200 hover:border-emerald-500/50 hover:bg-zinc-900 hover:shadow-xl hover:shadow-emerald-500/10 active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
              <Bug className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1 space-y-1 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-zinc-100 group-hover:text-white">
                    Zgłoś błąd bez logowania
                  </span>
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                    Jako Gość
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                  Szybkie zgłoszenie <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 leading-normal">
                Coś poszło nie tak w monitorowanej aplikacji? Wyślij raport natychmiast, bez konieczności rejestracji.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stopka z informacją o klawiaturze */}
      <div className="text-center pt-2">
        <p className="text-xs text-zinc-500 flex items-center justify-center gap-2">
          <span>Wskazówka: Użyj myszy lub klawiszy funkcyjnych do wygodnej nawigacji</span>
        </p>
      </div>
    </div>
  )
}
