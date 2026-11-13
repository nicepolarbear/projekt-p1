import { ArrowRight, CheckCircle2, Layers, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'

/**
 * OnboardingSuccessStep - Ekran sukcesu po utworzeniu konta lub organizacji.
 */
export function OnboardingSuccessStep({ user, organization, onFinish }) {
  const isOrg = Boolean(organization)

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-xl shadow-emerald-500/20">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Wdrożenie zakończone sukcesem</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          {isOrg ? 'Twoja organizacja jest gotowa!' : 'Witaj w TaskFlow!'}
        </h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          {isOrg
            ? `Firma ${organization.name} została zarejestrowana. Zostałeś automatycznie zalogowany jako Główny Administrator.`
            : 'Twoje konto zostało pomyślnie utworzone. Zostałeś zalogowany do Portalu TaskFlow.'}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 text-left text-xs text-zinc-300 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-zinc-100 truncate">
              {user ? `${user.first_name} ${user.last_name}` : 'Nowy użytkownik'}
            </div>
            <div className="text-zinc-400 font-mono text-[11px] truncate">{user?.email}</div>
          </div>
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300 uppercase tracking-wider">
            {user?.role?.name || (isOrg ? 'Administrator' : 'Reporter')}
          </span>
        </div>

        {organization && (
          <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between text-zinc-400 text-xs">
            <span>Przestrzeń robocza:</span>
            <span className="font-mono text-sky-300 font-medium">{organization.name}</span>
          </div>
        )}
      </div>

      <div className="pt-2">
        <Button
          type="button"
          onClick={onFinish}
          className="w-full h-11 gap-2 font-medium bg-sky-500 hover:bg-sky-400 text-zinc-950 shadow-lg shadow-sky-500/15"
        >
          <span>{isOrg ? 'Otwórz pulpit organizacji' : 'Przejdź do aplikacji'}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
