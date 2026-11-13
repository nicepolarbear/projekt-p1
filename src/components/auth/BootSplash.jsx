import { Layers, Loader2 } from 'lucide-react'

export function BootSplash({ message = 'Sprawdzanie aktywnej sesji...' }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-950 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] p-6 select-none">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-zinc-800/90 bg-zinc-900/90 px-10 py-8 shadow-2xl backdrop-blur-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-800/80 text-zinc-100 shadow-inner">
          <Layers className="h-6 w-6 text-sky-400" />
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">TaskFlow</h1>
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
            <span>{message}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
