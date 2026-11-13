import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/utils'

const VARIANT_STYLES = {
  default: 'border-zinc-800 bg-zinc-900/95 text-zinc-100',
  success: 'border-emerald-800/80 bg-zinc-900/95 text-emerald-100',
  destructive: 'border-red-800/80 bg-zinc-900/95 text-red-100',
  warning: 'border-amber-800/80 bg-zinc-900/95 text-amber-100',
  info: 'border-sky-800/80 bg-zinc-900/95 text-sky-100',
}

const VARIANT_ICONS = {
  default: null,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />,
  destructive: <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
  info: <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />,
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (!toasts || toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-label="Powiadomienia"
      className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((item) => {
        const variant = item.variant && VARIANT_STYLES[item.variant] ? item.variant : 'default'
        const icon = VARIANT_ICONS[variant]

        return (
          <div
            key={item.id}
            role={variant === 'destructive' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-200',
              VARIANT_STYLES[variant]
            )}
          >
            {icon}
            <div className="flex-1 min-w-0 space-y-1">
              {item.title && (
                <p className="text-sm font-medium leading-none tracking-tight">
                  {item.title}
                </p>
              )}
              {item.description && (
                <p className="text-xs text-zinc-400 leading-relaxed break-words">
                  {item.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Zamknij powiadomienie"
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
