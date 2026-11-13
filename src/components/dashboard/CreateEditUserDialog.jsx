import { useMemo, useState } from 'react'
import { AlertCircle, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { ROLE_META } from '../../lib/constants'
import { canEditEmployeePosition, canManageUsers } from '../../lib/permissions'
import { usersService } from '../../services/usersService'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { isUserActive, resolveUserRole } from './dashboardUtils'

const DEFAULT_ROLES = [
  { id: 1, name: 'admin', description: 'Administrator systemu' },
  { id: 2, name: 'dyrektor', description: 'Dyrektor / Zarząd firmy' },
  { id: 3, name: 'kierownik', description: 'Kierownik / Project Manager' },
  { id: 4, name: 'pracownik', description: 'Pracownik / Specjalista' },
]

function CreateEditUserForm({
  onOpenChange,
  user,
  currentUser,
  roles = [],
  positions = [],
  departments = [],
  onSaved,
}) {
  const { toast } = useToast()

  const rolesList = roles.length > 0 ? roles : DEFAULT_ROLES
  const isCreate = !user
  const isAdmin = canManageUsers(currentUser)
  const isDirector = currentUser?.role === 'dyrektor'
  const isSelf = Boolean(user && currentUser && user.id === currentUser.id)
  const targetRole = user ? resolveUserRole(user, rolesList) : 'pracownik'
  const canDirectorEditTarget =
    isDirector && user ? canEditEmployeePosition(currentUser, { ...user, role: targetRole }) : false

  const initialRoleId = useMemo(() => {
    if (user) {
      const resolvedRoleName = resolveUserRole(user, rolesList)
      const matchedRole =
        rolesList.find((r) => r.id === user.role_id) ||
        rolesList.find((r) => r.name === resolvedRoleName)
      return matchedRole ? String(matchedRole.id) : String(rolesList[3]?.id || 4)
    }
    const defaultPracownik = rolesList.find((r) => r.name === 'pracownik') || rolesList[0]
    return defaultPracownik ? String(defaultPracownik.id) : '4'
  }, [user, rolesList])

  const initialPositionId = useMemo(() => {
    if (user?.position_id) return String(user.position_id)
    const defaultPos = positions.find((p) => p.id === 4) || positions[0]
    return defaultPos ? String(defaultPos.id) : ''
  }, [user, positions])

  const initialDepartmentId = useMemo(() => {
    if (user?.department_id) return String(user.department_id)
    const defaultDept = departments.find((d) => d.code === 'ENG') || departments[0]
    return defaultDept ? String(defaultDept.id) : ''
  }, [user, departments])

  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [roleId, setRoleId] = useState(initialRoleId)
  const [positionId, setPositionId] = useState(initialPositionId)
  const [departmentId, setDepartmentId] = useState(initialDepartmentId)
  const [isActive, setIsActive] = useState(user ? isUserActive(user) : true)
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = useMemo(() => {
    if (isCreate) return isAdmin
    if (isAdmin) return true
    if (canDirectorEditTarget) return true
    return false
  }, [isCreate, isAdmin, canDirectorEditTarget])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!canSubmit) {
      setFormError('Wymaga roli Administratora.')
      return
    }

    if (isAdmin) {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        setFormError('Imię, nazwisko oraz adres e-mail są wymagane.')
        return
      }
      if (isCreate && password.length < 8) {
        setFormError('Hasło początkowe musi mieć co najmniej 8 znaków.')
        return
      }
      if (!isCreate && password && password.length < 8) {
        setFormError('Nowe hasło musi mieć co najmniej 8 znaków.')
        return
      }
    }

    if (!positionId || !departmentId) {
      setFormError('Wybierz stanowisko oraz dział użytkownika.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isCreate) {
        const payload = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          role_id: Number(roleId),
          position_id: Number(positionId),
          department_id: Number(departmentId),
          is_active: isActive,
          password,
        }
        await usersService.createUser(payload)
        toast({
          title: 'Użytkownik utworzony',
          description: `Konto dla ${firstName.trim()} ${lastName.trim()} zostało dodane.`,
        })
      } else if (isAdmin) {
        const payload = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          position_id: Number(positionId),
          department_id: Number(departmentId),
          ...(isSelf ? {} : { role_id: Number(roleId), is_active: isActive }),
          ...(password ? { password } : {}),
        }
        await usersService.updateUser(user.id, payload)
        toast({
          title: 'Dane użytkownika zapisane',
          description: `Zaktualizowano konto ${firstName.trim()} ${lastName.trim()}.`,
        })
      } else {
        await usersService.updateUser(user.id, {
          position_id: Number(positionId),
          department_id: Number(departmentId),
        })
        toast({
          title: 'Stanowisko i dział zaktualizowane',
          description: `Zmiany dla ${user.first_name} ${user.last_name} zostały zapisane.`,
        })
      }

      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      setFormError(err?.message || 'Nie udało się zapisać danych użytkownika.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-zinc-100">
          <ShieldCheck className="h-5 w-5 text-zinc-300" />
          {isCreate
            ? 'Dodaj nowego użytkownika'
            : isAdmin
              ? `Edytuj użytkownika: ${user.first_name} ${user.last_name}`
              : `Edytuj stanowisko / dział: ${user.first_name} ${user.last_name}`}
        </DialogTitle>
        <DialogDescription className="text-xs text-zinc-400">
          {isCreate
            ? 'Utwórz nowe konto pracownika wraz z rolą, stanowiskiem i hasłem startowym.'
            : isAdmin
              ? 'Zarządzaj danymi osobowymi, rolą, stanowiskiem, statusem aktywności lub resetem hasła.'
              : 'Jako Dyrektor możesz aktualizować stanowisko i dział kierowników oraz pracowników.'}
        </DialogDescription>
      </DialogHeader>

      <TooltipProvider delayDuration={150}>
        <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-800/80 bg-red-950/40 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-first-name">Imię *</Label>
                <Input
                  id="user-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!isAdmin}
                  required={isAdmin}
                  placeholder="Jan"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-last-name">Nazwisko *</Label>
                <Input
                  id="user-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!isAdmin}
                  required={isAdmin}
                  placeholder="Kowalski"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-email">Adres e-mail *</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isAdmin}
                  required={isAdmin}
                  placeholder="jan.kowalski@firma.pl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-phone">Telefon</Label>
                <Input
                  id="user-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="+48 600 000 000"
                />
              </div>
            </div>

            {/* Rola */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Rola systemowa</Label>
                {(!isAdmin || isSelf) && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                    <Lock className="h-3 w-3" />
                    {isSelf ? 'Ochrona własnego konta' : 'Wymaga roli Administratora'}
                  </span>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Select
                      value={roleId}
                      onValueChange={setRoleId}
                      disabled={!isAdmin || isSelf}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz rolę..." />
                      </SelectTrigger>
                      <SelectContent>
                        {rolesList.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {ROLE_META[r.name]?.label || r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                {(!isAdmin || isSelf) && (
                  <TooltipContent>
                    {isSelf
                      ? 'Nie możesz zmienić własnej roli administratora'
                      : 'Wymaga roli Administratora'}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>

            {/* Stanowisko i Dział */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Stanowisko</Label>
                <Select
                  value={positionId}
                  onValueChange={setPositionId}
                  disabled={!isAdmin && !canDirectorEditTarget}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz stanowisko..." />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Dział</Label>
                <Select
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  disabled={!isAdmin && !canDirectorEditTarget}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz dział..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name} ({d.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status aktywności */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <div>
                <p className="text-xs font-medium text-zinc-200">Status konta</p>
                <p className="text-[11px] text-zinc-500">
                  {isSelf
                    ? 'Nie możesz dezaktywować własnego konta'
                    : !isAdmin
                      ? 'Wymaga roli Administratora'
                      : isActive
                        ? 'Konto aktywne — użytkownik może się logować'
                        : 'Konto nieaktywne — logowanie zablokowane'}
                </p>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={!isAdmin || isSelf ? 0 : undefined}>
                    <Button
                      type="button"
                      size="sm"
                      variant={isActive ? 'secondary' : 'outline'}
                      disabled={!isAdmin || isSelf}
                      onClick={() => setIsActive((v) => !v)}
                      className={
                        isActive
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900/70'
                          : 'border-red-800/70 text-red-300 hover:bg-red-950/40'
                      }
                    >
                      {isActive ? 'Aktywne' : 'Nieaktywne'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {(!isAdmin || isSelf) && (
                  <TooltipContent>
                    {isSelf
                      ? 'Ochrona przed blokadą własnego konta'
                      : 'Wymaga roli Administratora'}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>

            {/* Hasło (Admin create lub Admin reset) */}
            {isAdmin && (
              <div className="space-y-1.5">
                <Label htmlFor="user-password">
                  {isCreate
                    ? 'Hasło początkowe * (min. 8 znaków)'
                    : 'Reset hasła (opcjonalnie — pozostaw puste, aby nie zmieniać)'}
                </Label>
                <Input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={isCreate}
                  minLength={isCreate || password ? 8 : undefined}
                  placeholder={isCreate ? 'Minimum 8 znaków...' : '••••••••'}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting || !canSubmit}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isCreate ? 'Utwórz użytkownika' : 'Zapisz zmiany'}
              </Button>
            </DialogFooter>
          </form>
      </TooltipProvider>
    </DialogContent>
  )
}

export function CreateEditUserDialog({ open, onOpenChange, user, ...props }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CreateEditUserForm
          key={user ? `edit-${user.id}` : 'create-new'}
          onOpenChange={onOpenChange}
          user={user}
          {...props}
        />
      )}
    </Dialog>
  )
}
