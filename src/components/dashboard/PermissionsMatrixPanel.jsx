import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { canManagePermissions } from '../../lib/permissions'
import { cn } from '../../lib/utils'
import { positionsService } from '../../services/positionsService'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Switch } from '../ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { PERMISSION_DEFINITIONS } from '../../lib/constants'
import { CreateEditPositionDialog } from './CreateEditPositionDialog'

const SYSTEM_POSITION_IDS = new Set([1, 2, 3, 4, 5])

export function PermissionsMatrixPanel({ refreshSignal }) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [positions, setPositions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingPosId, setUpdatingPosId] = useState(null)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [positionToEdit, setPositionToEdit] = useState(null)

  const hasEditAccess = canManagePermissions(user)

  const loadPositions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await positionsService.getPositions()
      setPositions(data)
    } catch (err) {
      setError(err?.message || 'Nie udało się pobrać listy posad i uprawnień.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPositions()
  }, [loadPositions, refreshSignal])

  // Real-time toggle of individual permission or admin flag
  const handleToggle = async (position, key, currentValue) => {
    if (!hasEditAccess || updatingPosId) return

    const newValue = !currentValue
    setUpdatingPosId(position.id)

    // Optimistic update
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id !== position.id) return p
        return {
          ...p,
          [key]: newValue,
        }
      })
    )

    try {
      const updated = await positionsService.updatePosition(position.id, {
        [key]: newValue,
      })

      // Update state with server response
      setPositions((prev) =>
        prev.map((p) => (p.id === position.id ? updated : p))
      )

      toast({
        title: 'Zaktualizowano uprawnienie',
        description: `Posada "${position.name}": ${key} = ${newValue ? 'Włączone' : 'Wyłączone'}.`,
      })
    } catch (err) {
      // Revert on error
      setPositions((prev) =>
        prev.map((p) => {
          if (p.id !== position.id) return p
          return {
            ...p,
            [key]: currentValue,
          }
        })
      )
      toast({
        title: 'Błąd aktualizacji',
        description: err?.message || 'Nie udało się zmienić uprawnienia.',
        variant: 'destructive',
      })
    } finally {
      setUpdatingPosId(null)
    }
  }

  const handleDeletePosition = async (pos) => {
    if (SYSTEM_POSITION_IDS.has(pos.id)) {
      toast({
        title: 'Operacja niedozwolona',
        description: 'Nie można usunąć podstawowej roli systemowej.',
        variant: 'destructive',
      })
      return
    }

    if (!window.confirm(`Czy na pewno chcesz usunąć posadę "${pos.name}"?`)) {
      return
    }

    try {
      await positionsService.deletePosition(pos.id)
      setPositions((prev) => prev.filter((p) => p.id !== pos.id))
      toast({
        title: 'Usunięto posadę',
        description: `Posada "${pos.name}" została trwale usunięta.`,
      })
    } catch (err) {
      toast({
        title: 'Błąd usuwania',
        description: err?.message || 'Nie udało się usunąć posady.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-zinc-800 bg-zinc-900/90 shadow-xl">
        <CardHeader className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-950/70 border border-sky-800 text-sky-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-base sm:text-lg font-bold text-zinc-100">
                Matryca Uprawnień Posad (Discord-style)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Konfiguruj uprawnienia ról organizacji w stylu Discorda. Włączenie{' '}
              <strong className="text-rose-400 font-semibold">Dostępu Administratora</strong>{' '}
              automatycznie przyznaje wszelkie prawa bez względu na pojedyncze przełączniki.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadPositions}
              disabled={isLoading}
              className="border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-xs gap-1.5"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              Odśwież
            </Button>

            {hasEditAccess && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setPositionToEdit(null)
                  setIsDialogOpen(true)
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Dodaj nową posadę
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center text-zinc-400 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-sky-400" />
              <p className="text-xs">Ładowanie matrycy uprawnień...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-red-300 space-y-2">
              <AlertCircle className="h-6 w-6 text-red-400 mx-auto" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400">
                    <th className="py-3 px-4 font-semibold text-zinc-300 min-w-[200px] sticky left-0 bg-zinc-950/95 z-10">
                      Nazwa posady
                    </th>
                    <th className="py-3 px-4 font-semibold min-w-[220px]">
                      Opis i zakres
                    </th>
                    {/* Administrator Column (Prominent Discord Style) */}
                    <th className="py-3 px-4 font-semibold text-rose-300 min-w-[140px] text-center bg-rose-950/20 border-x border-rose-900/40">
                      <div className="flex items-center justify-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                        <span>Administrator</span>
                      </div>
                    </th>
                    {/* Granular Permission Columns */}
                    {PERMISSION_DEFINITIONS.map((def) => {
                      const Icon = def.icon
                      return (
                        <th
                          key={def.key}
                          className="py-3 px-3 font-medium text-center min-w-[110px] whitespace-nowrap"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-1 cursor-help hover:text-zinc-200">
                                <Icon className="h-4 w-4 text-sky-400" />
                                <span className="text-[11px] truncate max-w-[90px]">
                                  {def.label.split(' ')[0]}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                              <p className="font-semibold text-zinc-100">{def.label}</p>
                              <p className="text-zinc-300">{def.desc}</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                      )
                    })}
                    {hasEditAccess && (
                      <th className="py-3 px-4 font-semibold text-right min-w-[100px]">
                        Akcje
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-800/80">
                  {positions.map((pos) => {
                    const isAdmin = Boolean(pos.is_admin)

                    return (
                      <tr
                        key={pos.id}
                        className={cn(
                          'hover:bg-zinc-800/40 transition-colors',
                          isAdmin && 'bg-rose-950/10'
                        )}
                      >
                        {/* Nazwa posady */}
                        <td className="py-3.5 px-4 font-semibold text-zinc-100 sticky left-0 bg-zinc-900/95 z-10">
                          <div className="flex items-center gap-2">
                            <span>{pos.name}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] px-1.5 py-0 font-normal',
                                pos.priority === 1
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              )}
                            >
                              P{pos.priority}
                            </Badge>
                          </div>
                        </td>

                        {/* Opis */}
                        <td className="py-3.5 px-4 text-zinc-400 text-[11px] max-w-xs truncate">
                          {pos.description || (
                            <span className="text-zinc-600 italic">Brak opisu</span>
                          )}
                        </td>

                        {/* Administrator Toggle */}
                        <td className="py-3.5 px-4 text-center bg-rose-950/10 border-x border-rose-900/30">
                          <div className="flex justify-center">
                            <Switch
                              checked={isAdmin}
                              disabled={!hasEditAccess || pos.id === 1}
                              onCheckedChange={() =>
                                handleToggle(pos, 'is_admin', isAdmin)
                              }
                              className="data-[state=checked]:bg-rose-600"
                            />
                          </div>
                        </td>

                        {/* Granular Permission Toggles */}
                        {PERMISSION_DEFINITIONS.map((def) => {
                          const isChecked = isAdmin || Boolean(pos[def.key])
                          const isControlledByAdmin = isAdmin

                          return (
                            <td key={def.key} className="py-3.5 px-3 text-center">
                              <div className="flex justify-center items-center">
                                {isControlledByAdmin ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="h-5 w-5 rounded-full bg-rose-950/80 border border-rose-800/80 text-rose-300 flex items-center justify-center cursor-help">
                                        <Check className="h-3 w-3 stroke-[3]" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      Nadane przez dostęp Administratora
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Switch
                                    checked={isChecked}
                                    disabled={!hasEditAccess}
                                    onCheckedChange={() =>
                                      handleToggle(pos, def.key, Boolean(pos[def.key]))
                                    }
                                  />
                                )}
                              </div>
                            </td>
                          )
                        })}

                        {/* Akcje */}
                        {hasEditAccess && (
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPositionToEdit(pos)
                                  setIsDialogOpen(true)
                                }}
                                className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>

                              {!SYSTEM_POSITION_IDS.has(pos.id) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePosition(pos)}
                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dodawania / Edycji Posady */}
      <CreateEditPositionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        positionToEdit={positionToEdit}
        onSaved={() => {
          loadPositions()
        }}
      />
    </div>
  )
}
