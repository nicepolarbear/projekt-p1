import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * buttonVariants definiuje wszystkie możliwe wyglądy przycisku.
 * 
 * cva() (class-variance-authority) to funkcja, która:
 * 1. Przyjmuje "bazowe" klasy, które zawsze się pojawiają (niezależnie od wariantu)
 * 2. Przyjmuje obiekt "variants" - klucze to nazwy właściwości (variant, size),
 *    wartości to obiekt mapujący wartość → klasy CSS
 * 3. Przyjmuje "defaultVariants" - co stosować gdy nie podamy wariantu
 * 
 * Użycie: buttonVariants({ variant: "outline", size: "sm" })
 * → zwraca gotowy string z klasami CSS
 */
const buttonVariants = cva(
  // Klasy bazowe — zawsze stosowane:
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Główny przycisk — wypełniony
        default: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
        // Przycisk niszczący — czerwony (np. "Usuń")
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        // Przycisk z obramowaniem, przezroczyste tło
        outline: 'border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800',
        // Subtelny, szary przycisk
        secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
        // Bez tła i obramowania — jak link
        ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100',
        // Wygląda jak link
        link: 'text-zinc-100 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        // Kwadratowy przycisk — np. na ikonę
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

/**
 * Komponent Button.
 * 
 * Props:
 * - className: dodatkowe klasy (zostaną połączone przez cn() bez konfliktów)
 * - variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
 * - size: "default" | "sm" | "lg" | "icon"
 * - asChild: gdy true, Button nie renderuje <button> tylko "przejmuje" swoje dziecko.
 *   Np. <Button asChild><a href="/link">Kliknij</a></Button> → renderuje <a> ze stylami Button.
 *   To jest wzorzec Radix UI / shadcn — bardzo elastyczny.
 * - ...props: reszta props (onClick, type, disabled itp.) przekazywana do <button>
 */
function Button({ className, variant, size, asChild = false, ...props }) {
  // Jeśli asChild=true, używamy Slot zamiast button
  // Slot to komponent Radix UI, który "pożycza" swoje właściwości dziecku
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
