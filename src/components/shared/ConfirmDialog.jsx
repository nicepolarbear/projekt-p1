import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Potwierdź akcję',
  description = 'Czy na pewno chcesz wykonać tę operację?',
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  variant = 'destructive',
  onConfirm,
  loading = false,
  children,
}) {
  const handleConfirm = async () => {
    if (loading) return
    await onConfirm?.()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !loading && onOpenChange?.(nextOpen)}>
      <DialogContent className="max-w-md border-zinc-800 bg-zinc-900">
        <DialogHeader>
          <div className="flex items-start gap-3 text-left">
            {variant === 'destructive' && (
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-900/60 bg-red-950/50 text-red-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            )}
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>

        {children && <div className="mt-1 text-sm text-zinc-300">{children}</div>}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={handleConfirm}
            disabled={loading}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
