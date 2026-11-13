import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRightCircle,
  BarChart3,
  Bug,
  CheckSquare,
  Globe,
  Key,
  Loader2,
  PlusCircle,
  Save,
  ScrollText,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/utils'
import { positionsService } from '../../services/positionsService'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Textarea } from '../ui/textarea'

import { PERMISSION_DEFINITIONS } from '../../lib/constants'

export function CreateEditPositionDialog({
  open,
  onOpenChange,
  positionToEdit = null,
  onSaved,
}) {
  const { toast } = useToast()
  const isEditing = Boolean(positionToEdit)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(3)
  const [isDelegatable, setIsDelegatable] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [permissions, setPermissions] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return

    if (positionToEdit) {
      setName(positionToEdit.name || '')
      setDescription(positionToEdit.description || '')
      setPriority(positionToEdit.priority ?? 3)
      setIsDelegatable(Boolean(positionToEdit.is_delegatable))
      setIsAdmin(Boolean(positionToEdit.is_admin))

      const currentPerms = {}
      PERMISSION_DEFINITIONS.forEach((def) => {
        currentPerms[def.key] = Boolean(positionToEdit[def.key])
      })
      setPermissions(currentPerms)
    } else {
      setName('')
      setDescription('')
      setPriority(3)
      setIsDelegatable(true)
      setIsAdmin(false)

      const initialPerms = {
        can_create_tasks: true,
        can_assign_tasks: true,
      }
      setPermissions(initialPerms)
    }
    setError(null)
  }, [open, positionToEdit])

  const handlePermissionToggle = (key, value) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName || cleanName.length < 2) {
      setError('Nazwa posady musi mieć co najmniej 2 znaki.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        name: cleanName,
        description: description.trim() || null,
        priority: Number(priority),
        is_delegatable: isDelegatable,
        is_admin: isAdmin,
        ...permissions,
      }

      let saved
      if (isEditing) {
        saved = await positionsService.updatePosition(positionToEdit.id, payload)
        toast({
          title: 'Posada zaktualizowana',
          description: `Zaktualizowano uprawnienia dla "${cleanName}".`,
        })
      } else {
        saved = await positionsService.createPosition(payload)
        toast({
          title: 'Utworzono nową posadę',
          description: `Pomyślnie dodano posadę "${cleanName}" do organizacji.`,
        })
      }

      onSaved?.(saved)
      onOpenChange?.(false)
    } catch (err) {
      setError(err?.message || 'Nie udało się zapisać posady.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
        {/* macOS style header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs font-semibold text-zinc-400 pl-2">
              {isEditing ? 'Edycja uprawnień posady' : 'Kreator nowej posady'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Shield className="h-5 w-5 text-sky-400" />
              {isEditing ? `Edycja posady: ${positionToEdit.name}` : 'Dodaj nową posadę'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Skonfiguruj nazwę, hierarchię oraz precyzyjne uprawnienia w stylu Discorda.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3.5 rounded-xl border border-red-800/80 bg-red-950/40 text-xs text-red-200 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Podstawowe dane */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="pos-name" className="text-xs text-zinc-300">
                  Nazwa posady <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="pos-name"
                  placeholder="np. Project Manager, QA Engineer, Dyrektor..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pos-priority" className="text-xs text-zinc-300">
                  Priorytet w hierarchii (1-10)
                </Label>
                <Input
                  id="pos-priority"
                  type="number"
                  min={1}
                  max={10}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                />
                <span className="text-[10px] text-zinc-500 block leading-tight">
                  1 = najwyższy (Zarząd), 10 = bazowy
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pos-desc" className="text-xs text-zinc-300">
                Opis posady i zakresu obowiązków
              </Label>
              <Textarea
                id="pos-desc"
                placeholder="Krótki opis roli, odpowiedzialności i praw w zespole..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100 resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <div>
                <p className="text-xs font-semibold text-zinc-200">
                  Umożliwia delegowanie zadań w dół
                </p>
                <p className="text-[11px] text-zinc-400">
                  Osoby na tej posadzie mogą przekazywać swoje zadania pracownikom o niższym priorytecie.
                </p>
              </div>
              <Switch
                checked={isDelegatable}
                onCheckedChange={setIsDelegatable}
              />
            </div>
          </div>

          {/* Dostęp Administratora (Discord Style Prominent Switch) */}
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span className="text-sm font-bold text-rose-200">
                    Dostęp Administratora (is_admin)
                  </span>
                </div>
                <p className="text-xs text-rose-300/80 leading-relaxed">
                  Członkowie z tym uprawnieniem posiadają pełny dostęp do wszystkich funkcji systemu,
                  zarządzania użytkownikami, kasowania danych oraz omijają wszelkie ograniczenia kanałowe i funkcyjne.
                </p>
              </div>
              <Switch
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
                className="data-[state=checked]:bg-rose-600 mt-1"
              />
            </div>

            {isAdmin && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-200 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span>
                  Wszystkie poniższe uprawnienia zostały automatycznie aktywowane.
                </span>
              </div>
            )}
          </div>

          {/* Granularne Uprawnienia */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Szczegółowe uprawnienia systemowe
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {PERMISSION_DEFINITIONS.map((def) => {
                const Icon = def.icon
                const isChecked = isAdmin || Boolean(permissions[def.key])

                return (
                  <div
                    key={def.key}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border transition-colors',
                      isChecked
                        ? 'border-sky-800/80 bg-sky-950/20'
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg border',
                          isChecked
                            ? 'border-sky-700 bg-sky-950 text-sky-400'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                          {def.label}
                          <span className="text-[10px] text-zinc-500 font-normal">
                            ({def.category})
                          </span>
                        </p>
                        <p className="text-[11px] text-zinc-400 leading-tight">
                          {def.desc}
                        </p>
                      </div>
                    </div>

                    <Switch
                      checked={isChecked}
                      disabled={isAdmin}
                      onCheckedChange={(val) => handlePermissionToggle(def.key, val)}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stopka dialogu */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800/80">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {isEditing ? 'Zapisz zmiany' : 'Utwórz posadę'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
