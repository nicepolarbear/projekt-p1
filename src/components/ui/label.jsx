import * as LabelPrimitive from '@radix-ui/react-label'
import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Label - etykieta pola formularza.
 * 
 * Używamy @radix-ui/react-label zamiast zwykłego <label>,
 * bo Radix obsługuje edge-case'y związane z focusem i klikaniem
 * (np. label powiązany z wyłączonym inputem nie powinien być klikalny).
 * 
 * Użycie: <Label htmlFor="title">Tytuł zadania</Label>
 * Powiązanie z inputem przez: <Input id="title" />
 * → Kliknięcie w Label automatycznie fokusuje Input
 */
const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none text-zinc-200',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
