import { useState } from 'react'
import { Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Separator } from '../ui/separator'

const PREFERENCE_ITEMS = [
  {
    key: 'compact_cards',
    label: 'Kompaktowe karty zadań',
    description: 'Zmniejsza odstępy oraz ukrywa dodatkowe szczegóły na kartach w panelach.',
    defaultValue: false,
  },
  {
    key: 'auto_open_todo',
    label: 'Automatycznie otwieraj panel „Do zrobienia”',
    description: 'Po uruchomieniu pulpitu automatycznie wysuwa lewy panel zadań oczekujących.',
    defaultValue: false,
  },
  {
    key: 'confirm_delete',
    label: 'Potwierdzaj przeniesienie do kosza',
    description: 'Wyświetla okno potwierdzenia przed przeniesieniem zadania do kosza.',
    defaultValue: true,
  },
]

export function ProfilePreferencesCard({ onResetDesktopLayout }) {
  const { user, updatePreferences } = useAuth()
  const { toast } = useToast()
  const [savingKey, setSavingKey] = useState(null)

  const prefs = user?.preferences || {}

  const handleToggle = async (key, currentValue) => {
    if (savingKey) return
    const nextValue = !currentValue
    setSavingKey(key)

    try {
      await updatePreferences({
        [key]: nextValue,
      })
      toast({
        variant: 'success',
        title: 'Preferencje zapisane',
        description: 'Zaktualizowano ustawienia obszaru roboczego.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Nie udało się zapisać preferencji',
        description: error?.message || 'Spróbuj ponownie za chwilę.',
      })
    } finally {
      setSavingKey(null)
    }
  }

  const handleResetLayout = () => {
    onResetDesktopLayout?.()
    toast({
      variant: 'success',
      title: 'Układ okien zresetowany',
      description: 'Przywrócono domyślne pozycje okien na pulpicie zadań.',
    })
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-sky-400" />
          <CardTitle className="text-base">Preferencje obszaru roboczego</CardTitle>
        </div>
        <CardDescription>
          Dostosuj zachowanie kart zadań, paneli bocznych oraz okien na pulpicie.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {PREFERENCE_ITEMS.map((item) => {
            const isChecked =
              prefs[item.key] !== undefined ? Boolean(prefs[item.key]) : item.defaultValue
            const isBusy = savingKey === item.key

            return (
              <div
                key={item.key}
                className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3"
              >
                <div className="space-y-0.5">
                  <label
                    htmlFor={`pref-${item.key}`}
                    className="cursor-pointer text-sm font-medium text-zinc-200"
                  >
                    {item.label}
                  </label>
                  <p className="text-xs leading-relaxed text-zinc-500">
                    {item.description}
                  </p>
                </div>

                <button
                  id={`pref-${item.key}`}
                  type="button"
                  role="switch"
                  aria-checked={isChecked}
                  disabled={Boolean(savingKey)}
                  onClick={() => handleToggle(item.key, isChecked)}
                  className={cn(
                    'relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-60',
                    isChecked ? 'bg-sky-500' : 'bg-zinc-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform',
                      isChecked ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                  >
                    {isBusy && <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-700" />}
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        <Separator />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-300">Pozycje okien pulpitu</p>
            <p className="text-[11px] text-zinc-500">
              Przywróć domyślną siatkę otwartych zadań.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            className="gap-1.5 shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Resetuj układ okien na pulpicie
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
