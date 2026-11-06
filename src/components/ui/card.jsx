import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Card to zestaw komponentów tworzących "kartę" — ramkę z zawartością.
 * 
 * shadcn/ui rozkłada Card na kilka podkomponentów:
 * - Card          - zewnętrzny kontener z obramowaniem i tłem
 * - CardHeader    - górna sekcja karty (tytuł, opis)
 * - CardTitle     - tytuł karty (h3)
 * - CardDescription - podtytuł/opis pod tytułem
 * - CardContent   - główna zawartość karty
 * - CardFooter    - dolna sekcja (np. przyciski akcji)
 * 
 * Użycie:
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Tytuł zadania</CardTitle>
 *     <CardDescription>Krótki opis</CardDescription>
 *   </CardHeader>
 *   <CardContent>... treść ...</CardContent>
 *   <CardFooter>... przyciski ...</CardFooter>
 * </Card>
 * 
 * Każdy podkomponent to po prostu div z odpowiednimi klasami.
 * Dzielimy je osobno, bo daje to elastyczność — możemy użyć
 * tylko CardHeader bez reszty, albo CardContent bez headera.
 */

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow',
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn('text-sm text-zinc-400', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props} />
  )
}

function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
