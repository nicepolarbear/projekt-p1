import { useState } from 'react'
import { Check, Loader2, Lock, Save, UserCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { AVATAR_COLORS, ROLE_META } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { Avatar } from '../shared/Avatar'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'

export function ProfileInfoForm() {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()

  const userSnapshotKey = `${user?.id ?? ''}|${user?.first_name ?? ''}|${user?.last_name ?? ''}|${user?.phone ?? ''}|${user?.bio ?? ''}|${user?.avatar_color ?? ''}`
  const [syncedKey, setSyncedKey] = useState(userSnapshotKey)
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarColor, setAvatarColor] = useState(user?.avatar_color || AVATAR_COLORS[0])
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  if (syncedKey !== userSnapshotKey) {
    setSyncedKey(userSnapshotKey)
    setFirstName(user?.first_name || '')
    setLastName(user?.last_name || '')
    setPhone(user?.phone || '')
    setBio(user?.bio || '')
    setAvatarColor(user?.avatar_color || AVATAR_COLORS[0])
    setFieldErrors({})
  }

  const roleLabel = ROLE_META[user?.role]?.label || user?.role || 'Pracownik'
  const positionLabel = user?.position?.name
    ? `${user.position.name}${typeof user.position.priority === 'number' ? ` (Poziom ${user.position.priority})` : ''}`
    : 'Nie przypisano'

  const validate = () => {
    const errors = {}
    if (!firstName.trim()) {
      errors.first_name = 'Imię jest wymagane.'
    } else if (firstName.trim().length < 2) {
      errors.first_name = 'Imię musi mieć co najmniej 2 znaki.'
    }

    if (!lastName.trim()) {
      errors.last_name = 'Nazwisko jest wymagane.'
    } else if (lastName.trim().length < 2) {
      errors.last_name = 'Nazwisko musi mieć co najmniej 2 znaki.'
    }

    if (phone.trim().length > 30) {
      errors.phone = 'Numer telefonu może mieć maksymalnie 30 znaków.'
    }

    if (bio.trim().length > 500) {
      errors.bio = 'Opis może mieć maksymalnie 500 znaków.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        avatar_color: avatarColor,
      })
      toast({
        variant: 'success',
        title: 'Profil zaktualizowany',
        description: 'Twoje dane osobowe zostały pomyślnie zapisane.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Błąd zapisu profilu',
        description: error?.message || 'Nie udało się zaktualizować danych profilu.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const previewUser = {
    ...user,
    first_name: firstName || user?.first_name,
    last_name: lastName || user?.last_name,
    avatar_color: avatarColor,
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-sky-400" />
          <CardTitle className="text-base">Dane osobowe</CardTitle>
        </div>
        <CardDescription>
          Edytuj podstawowe informacje kontaktowe oraz kolor swojego awatara.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Podgląd i wybór koloru awatara */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar user={previewUser} size="lg" />
                <div>
                  <p className="text-xs font-medium text-zinc-200">Kolor awatara</p>
                  <p className="text-[11px] text-zinc-500">
                    Widoczny na kartach zadań i pasku nawigacji
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Kolor awatara">
                {AVATAR_COLORS.map((color) => {
                  const isSelected = avatarColor?.toLowerCase() === color.toLowerCase()
                  return (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`Wybierz kolor ${color}`}
                      onClick={() => setAvatarColor(color)}
                      disabled={isSaving}
                      style={{ backgroundColor: color }}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300',
                        isSelected
                          ? 'border-white ring-2 ring-zinc-300/60 scale-105'
                          : 'border-white/15 opacity-85 hover:opacity-100'
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-first-name">Imię</Label>
              <Input
                id="profile-first-name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value)
                  if (fieldErrors.first_name) {
                    setFieldErrors((prev) => ({ ...prev, first_name: undefined }))
                  }
                }}
                disabled={isSaving}
                placeholder="Jan"
                className={cn(fieldErrors.first_name && 'border-red-700')}
              />
              {fieldErrors.first_name && (
                <p className="text-xs text-red-400">{fieldErrors.first_name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-last-name">Nazwisko</Label>
              <Input
                id="profile-last-name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value)
                  if (fieldErrors.last_name) {
                    setFieldErrors((prev) => ({ ...prev, last_name: undefined }))
                  }
                }}
                disabled={isSaving}
                placeholder="Kowalski"
                className={cn(fieldErrors.last_name && 'border-red-700')}
              />
              {fieldErrors.last_name && (
                <p className="text-xs text-red-400">{fieldErrors.last_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">Telefon służbowy</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                if (fieldErrors.phone) {
                  setFieldErrors((prev) => ({ ...prev, phone: undefined }))
                }
              }}
              disabled={isSaving}
              placeholder="+48 600 000 000"
              className={cn(fieldErrors.phone && 'border-red-700')}
            />
            {fieldErrors.phone && (
              <p className="text-xs text-red-400">{fieldErrors.phone}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="profile-bio">O mnie / Bio</Label>
              <span className="text-[11px] text-zinc-500">{bio.length}/500</span>
            </div>
            <Textarea
              id="profile-bio"
              rows={3}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value)
                if (fieldErrors.bio) {
                  setFieldErrors((prev) => ({ ...prev, bio: undefined }))
                }
              }}
              disabled={isSaving}
              placeholder="Krótki opis Twojej roli i specjalizacji..."
              className={cn('min-h-[88px]', fieldErrors.bio && 'border-red-700')}
            />
            {fieldErrors.bio && (
              <p className="text-xs text-red-400">{fieldErrors.bio}</p>
            )}
          </div>

          {/* Pola zablokowane (tylko do odczytu) */}
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Lock className="h-3.5 w-3.5 text-zinc-500" />
              <span>Dane zarządzane przez administratora</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email" className="text-zinc-400">
                Adres e-mail
              </Label>
              <Input
                id="profile-email"
                value={user?.email || ''}
                readOnly
                disabled
                className="bg-zinc-950/60 text-zinc-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-role" className="text-zinc-400">
                  Rola systemowa
                </Label>
                <Input
                  id="profile-role"
                  value={roleLabel}
                  readOnly
                  disabled
                  className="bg-zinc-950/60 text-zinc-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-position" className="text-zinc-400">
                  Stanowisko
                </Label>
                <Input
                  id="profile-position"
                  value={positionLabel}
                  readOnly
                  disabled
                  className="bg-zinc-950/60 text-zinc-400"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Zapisz zmiany
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
