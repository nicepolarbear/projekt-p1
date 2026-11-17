import { Toaster as SonnerToaster } from 'sonner'

/**
 * Toaster - komponent renderujący powiadomienia Sonner.
 * Zgodnie z preferencjami użytkownika:
 * - Pozycja: 'bottom-right' (prawy dolny róg)
 * - Grupować i rozszerzać: expand={true}
 * - Czas wyświetlania: duration={10000} (10 sekund)
 * - Ciemny motyw pasujący do zinc-950 / zinc-900
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={true}
      duration={10000}
      theme="dark"
      richColors
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl font-sans',
          description: 'group-[.toast]:text-zinc-400 font-sans',
          actionButton:
            'group-[.toast]:bg-sky-500 group-[.toast]:hover:bg-sky-400 group-[.toast]:text-zinc-950 group-[.toast]:font-semibold group-[.toast]:text-xs group-[.toast]:px-2.5 group-[.toast]:py-1.5 group-[.toast]:rounded-lg',
          cancelButton:
            'group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-300 group-[.toast]:rounded-lg',
          closeButton:
            'group-[.toast]:bg-zinc-800 group-[.toast]:border-zinc-700 group-[.toast]:text-zinc-400 group-[.toast]:hover:text-zinc-200',
        },
      }}
    />
  )
}
