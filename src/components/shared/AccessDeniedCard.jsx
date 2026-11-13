import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'

export function AccessDeniedCard({
  onBack,
  title = 'Brak dostępu do panelu zarządczego',
  description = 'Ta sekcja jest dostępna wyłącznie dla dyrektorów oraz administratorów systemu.',
  className,
}) {
  return (
    <div className={cn('flex min-h-[60vh] w-full items-center justify-center p-6', className)}>
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/95 shadow-2xl">
        <CardHeader className="items-center text-center pb-3">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-900/60 bg-red-950/50 text-red-400 shadow-inner">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <CardTitle className="text-lg text-zinc-100">{title}</CardTitle>
          <CardDescription className="text-zinc-400 leading-relaxed pt-1">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-center text-xs text-zinc-500">
            Jeśli potrzebujesz dostępu do raportów zarządczych, skontaktuj się z administratorem systemu.
          </div>
        </CardContent>
        <CardFooter className="justify-center pt-4">
          <Button
            type="button"
            variant="default"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć do pulpitu zadań
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
