import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Funkcja cn() (skrót od "classNames") to helper używany przez WSZYSTKIE
 * komponenty shadcn/ui. Robi dwie rzeczy naraz:
 *
 * 1. clsx() - pozwala pisać klasy warunkowo:
 *    cn("bazowa-klasa", isActive && "active", error ? "text-red" : "text-green")
 *    → jeśli isActive=true: "bazowa-klasa active text-green"
 *    → jeśli isActive=false: "bazowa-klasa text-green"
 *
 * 2. twMerge() - rozwiązuje konflikty klas Tailwinda:
 *    cn("px-4 px-8")       → "px-8"       (px-8 wygrywa)
 *    cn("text-red-500", "text-blue-500") → "text-blue-500"
 *
 * BEZ twMerge Tailwind nie wie, która klasa ma wygrać przy konflikcie
 * i stosuje obie (co daje nieprzewidywalne wyniki).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
