import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Input - pole tekstowe jednoliniowe.
 * 
 * To jest prosty wrapper na <input> HTML z klasami Tailwinda.
 * Nie wymaga Radix UI bo przeglądarki mają wbudowaną obsługę inputów.
 * 
 * React.forwardRef - przekazujemy ref do elementu DOM.
 * Ref jest potrzebny gdy rodzic chce bezpośrednio dostać do inputu
 * (np. library react-hook-form tego wymaga do śledzenia wartości).
 */
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        // Bazowe style
        'flex h-9 w-full rounded-md',
        // Obramowanie i tło (dark mode)
        'border border-zinc-700 bg-zinc-800',
        // Padding i typografia
        'px-3 py-1 text-sm text-zinc-100',
        // Placeholder (tekst podpowiedzi gdy puste)
        'placeholder:text-zinc-500',
        // Fokus - podświetlenie przy kliknięciu (accessibility)
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500',
        // Stan wyłączony
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Pliki (typ="file")
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
