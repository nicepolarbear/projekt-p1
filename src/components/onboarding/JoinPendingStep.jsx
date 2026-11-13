import { Clock, Home, ShieldAlert } from 'lucide-react'
import { Button } from '../ui/button'

/**
 * JoinPendingStep - Ekran informujący o oczekiwaniu na zatwierdzenie wniosku o dołączenie do firmy.
 */
export function JoinPendingStep({ orgName, onGoHome }) {
  return (
    <div className="w-full max-w-lg mx-auto space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-xl shadow-amber-500/10">
        <Clock className="h-8 w-8 animate-pulse" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-mono">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Wniosek przesłany</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Oczekiwanie na zatwierdzenie
        </h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Wysłano prośbę o dołączenie. Administrator lub Dyrektor{' '}
          {orgName ? <strong className="text-zinc-200">firmy {orgName}</strong> : 'organizacji'}{' '}
          musi zatwierdzić Twoje konto, zanim będziesz mógł się zalogować.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 text-left text-xs text-zinc-400 space-y-2">
        <div className="font-semibold text-zinc-200">Co dzieje się dalej?</div>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>Administrator otrzymał powiadomienie o nowym wniosku w panelu firmy.</li>
          <li>Po zatwierdzeniu Twoje konto zostanie aktywowane i uzyskasz dostęp do tablicy zadań.</li>
          <li>Będziesz mógł zalogować się ustalonym hasłem.</li>
        </ul>
      </div>

      <div className="pt-2">
        <Button
          type="button"
          onClick={onGoHome}
          className="w-full h-11 gap-2 font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-950"
        >
          <Home className="h-4 w-4" />
          <span>Wróć do strony głównej</span>
        </Button>
      </div>
    </div>
  )
}
