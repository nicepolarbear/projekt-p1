import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Dialog (Modal) zbudowany na @radix-ui/react-dialog.
 * 
 * Radix UI dostarcza "headless" prymitywy — tzn. komponent z logiką
 * (otwieranie/zamykanie, fokus, trap focus, ESC key, aria-*) ale BEZ stylów.
 * My (shadcn) tylko nakładamy klasy Tailwinda.
 * 
 * Struktura:
 * <Dialog>                    ← kontroluje stan otwarcia (open/onOpenChange)
 *   <DialogTrigger>           ← element, który otwiera dialog po kliknięciu
 *   <DialogContent>           ← samo okno modala (pojawia się na środku)
 *     <DialogHeader>          ← sekcja z tytułem
 *       <DialogTitle>         ← tytuł (wymagany dla accessibility)
 *       <DialogDescription>  ← opis (opcjonalny)
 *     <DialogFooter>          ← sekcja z przyciskami
 * 
 * Radix automatycznie:
 * - Blokuje scroll strony gdy dialog jest otwarty
 * - Zatrzymuje fokus klawiatury wewnątrz dialogu (tab nie wychodzi)
 * - Zamyka po ESC
 * - Dodaje aria-modal, aria-labelledby itp.
 */

// Eksportujemy Root i Trigger bezpośrednio z Radix (nie potrzebują stylów)
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

/**
 * Overlay — półprzezroczyste tło za modalem.
 * 'fixed inset-0' → pozycja absolutna, pokrywa cały ekran
 * 'bg-black/60'   → czarne z 60% przezroczystością
 * data-[state=...] → Radix dodaje atrybut data-state="open"/"closed"
 *                     co pozwala animować wejście/wyjście
 */
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Content — samo okno modala.
 * Renderuje się przez Portal (poza drzewem DOM Reacta, w body)
 * żeby nie było problemów ze z-index, overflow: hidden itp.
 */
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Środek ekranu
        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
        // Wymiary
        'w-full max-w-lg',
        // Styl
        'bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl',
        'p-6',
        // Animacja wejścia/wyjścia
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
        'data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-top-1/2',
        'duration-200',
        className
      )}
      {...props}
    >
      {children}
      {/* Przycisk X do zamknięcia - Radix automatycznie go obsługuje */}
      <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 text-zinc-400 hover:text-zinc-100 transition-opacity">
        <X className="h-4 w-4" />
        <span className="sr-only">Zamknij</span>
      </DialogClose>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-center sm:text-left mb-4', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6', className)}
      {...props}
    />
  )
}

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-zinc-100', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-zinc-400', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
