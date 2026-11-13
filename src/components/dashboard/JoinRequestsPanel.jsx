import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import {
  canApproveJoinRequests,
  canGenerateInvites,
} from '../../lib/permissions'
import { cn } from '../../lib/utils'
import { organizationService } from '../../services/organizationService'
import { positionsService } from '../../services/positionsService'
import { Avatar } from '../shared/Avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export function JoinRequestsPanel({ refreshSignal }) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [codes, setCodes] = useState([])
  const [requests, setRequests] = useState([])
  const [positions, setPositions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Generate code form state
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestedPositionId, setSuggestedPositionId] = useState('none')
  const [maxUses, setMaxUses] = useState(1)
  const [latestCode, setLatestCode] = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)

  // Approval dialog state
  const [requestToApprove, setRequestToApprove] = useState(null)
  const [approvePositionId, setApprovePositionId] = useState('4')
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false)

  // Rejecting state
  const [rejectingId, setRejectingId] = useState(null)

  const canGenerate = canGenerateInvites(user)
  const canApprove = canApproveJoinRequests(user)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [codesData, requestsData, positionsData] = await Promise.all([
        canGenerate ? organizationService.getJoinCodes() : Promise.resolve([]),
        canApprove ? organizationService.getJoinRequests() : Promise.resolve([]),
        positionsService.getPositions(),
      ])

      setCodes(codesData)
      setRequests(requestsData)
      setPositions(positionsData)
    } catch (err) {
      setError(err?.message || 'Nie udało się pobrać danych kodów i wniosków.')
    } finally {
      setIsLoading(false)
    }
  }, [canGenerate, canApprove])

  useEffect(() => {
    loadData()
  }, [loadData, refreshSignal])

  const handleCopy = async (codeText) => {
    try {
      await navigator.clipboard.writeText(codeText)
      setCopiedCode(codeText)
      toast({
        title: 'Skopiowano kod dołączenia',
        description: `Kod ${codeText} został skopiowany do schowka.`,
      })
      setTimeout(() => setCopiedCode(null), 2500)
    } catch {
      toast({
        title: 'Błąd kopiowania',
        description: 'Nie udało się skopiować kodu.',
        variant: 'destructive',
      })
    }
  }

  const handleGenerateCode = async (e) => {
    e.preventDefault()
    if (!canGenerate || isGenerating) return

    setIsGenerating(true)
    try {
      const payload = {
        max_uses: Number(maxUses) || 1,
        suggested_position_id:
          suggestedPositionId !== 'none' ? Number(suggestedPositionId) : null,
      }

      const created = await organizationService.createJoinCode(payload)
      setCodes((prev) => [created, ...prev])
      setLatestCode(created)
      toast({
        title: 'Kod wygenerowany!',
        description: `Wygenerowano unikalny kod dołączenia: ${created.code}`,
      })
    } catch (err) {
      toast({
        title: 'Błąd generowania kodu',
        description: err?.message || 'Nie udało się utworzyć kodu zaproszenia.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOpenApproveDialog = (req) => {
    setRequestToApprove(req)
    setApprovePositionId(
      req.assigned_position_id ? String(req.assigned_position_id) : '4'
    )
  }

  const handleConfirmApproval = async () => {
    if (!requestToApprove) return

    setIsSubmittingApproval(true)
    try {
      await organizationService.approveJoinRequest(requestToApprove.id, {
        assigned_position_id: Number(approvePositionId),
      })

      const assignedPos = positions.find((p) => String(p.id) === String(approvePositionId))

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestToApprove.id
            ? {
                ...r,
                status: 'approved',
                assigned_position_name: assignedPos?.name || r.assigned_position_name,
              }
            : r
        )
      )

      toast({
        title: 'Użytkownik zatwierdzony',
        description: `${requestToApprove.first_name} ${requestToApprove.last_name} dołączył do organizacji.`,
      })
      setRequestToApprove(null)
    } catch (err) {
      toast({
        title: 'Błąd zatwierdzania',
        description: err?.message || 'Nie udało się zatwierdzić wniosku.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingApproval(false)
    }
  }

  const handleRejectRequest = async (req) => {
    if (!window.confirm(`Czy na pewno odrzucić wniosek od ${req.first_name} ${req.last_name}?`)) {
      return
    }

    setRejectingId(req.id)
    try {
      await organizationService.rejectJoinRequest(req.id)
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'rejected' } : r))
      )
      toast({
        title: 'Wniosek odrzucony',
        description: `Wniosek użytkownika ${req.first_name} ${req.last_name} został odrzucony.`,
      })
    } catch (err) {
      toast({
        title: 'Błąd odrzucania',
        description: err?.message || 'Nie udało się odrzucić wniosku.',
        variant: 'destructive',
      })
    } finally {
      setRejectingId(null)
    }
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const reviewedRequests = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl border border-red-800/80 bg-red-950/40 text-red-200 flex items-start gap-2.5 text-xs">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Sekcja 1: Generowanie i lista kodów zaproszeń */}
      {canGenerate && (
        <Card className="border-zinc-800 bg-zinc-900/90 shadow-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-950 border border-sky-800 text-sky-400">
                  <Key className="h-5 w-5" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold text-zinc-100">
                  Kody zaproszeń do organizacji
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Generuj jednorazowe kody (np. TF-84920), które kandydaci wpisują podczas rejestracji, by wysłać prośbę o dołączenie.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-xs gap-1.5 shrink-0"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              Odśwież
            </Button>
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            {/* Formularz generowania kodu */}
            <form
              onSubmit={handleGenerateCode}
              className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col md:flex-row items-end gap-3"
            >
              <div className="space-y-1 flex-1 w-full">
                <Label htmlFor="sugg-pos" className="text-xs text-zinc-300">
                  Sugerowane stanowisko docelowe:
                </Label>
                <Select
                  value={suggestedPositionId}
                  onValueChange={setSuggestedPositionId}
                >
                  <SelectTrigger id="sugg-pos" className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200">
                    <SelectValue placeholder="Wybierz stanowisko" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectItem value="none">Brak (przypisanie ręczne)</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} (P{p.priority})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 w-full md:w-36">
                <Label htmlFor="max-uses" className="text-xs text-zinc-300">
                  Maks. użyć:
                </Label>
                <Input
                  id="max-uses"
                  type="number"
                  min={1}
                  max={50}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200"
                />
              </div>

              <Button
                type="submit"
                disabled={isGenerating}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs gap-1.5 w-full md:w-auto shrink-0"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Wygeneruj nowy kod
              </Button>
            </form>

            {/* Nowo wygenerowany kod (Highlight) */}
            {latestCode && (
              <div className="p-4 rounded-xl border border-sky-800/80 bg-sky-950/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-900/60 text-sky-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-sky-300 font-medium">
                      Ostatnio wygenerowany kod zaproszenia:
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xl font-black text-sky-400 tracking-wider">
                        {latestCode.code}
                      </span>
                      {latestCode.suggested_position_name && (
                        <Badge variant="outline" className="text-[10px] bg-zinc-900 text-zinc-300 border-zinc-700">
                          {latestCode.suggested_position_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleCopy(latestCode.code)}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedCode === latestCode.code ? 'Skopiowano' : 'Kopiuj kod'}
                </Button>
              </div>
            )}

            {/* Tabela kodów */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Wygenerowane kody zaproszeń ({codes.length})
              </span>

              <div className="rounded-xl border border-zinc-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400">
                      <th className="py-2.5 px-3 font-semibold">Kod zaproszenia</th>
                      <th className="py-2.5 px-3 font-semibold">Sugerowane stanowisko</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Użycia</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Utworzono</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Akcja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {codes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500">
                          Brak wygenerowanych kodów zaproszeń. Wygeneruj pierwszy powyżej!
                        </td>
                      </tr>
                    ) : (
                      codes.map((c) => (
                        <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                            {c.code}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-300">
                            {c.suggested_position_name || (
                              <span className="text-zinc-500 italic">Dowolne</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-zinc-400">
                            {c.uses_count} / {c.max_uses}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {c.is_active ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-950/60 text-emerald-400 border-emerald-800">
                                Aktywny
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700">
                                Zużyty
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400">
                            {new Date(c.created_at).toLocaleDateString('pl-PL')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(c.code)}
                              className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              {copiedCode === c.code ? 'Skopiowano' : 'Kopiuj'}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sekcja 2: Oczekujące wnioski o dołączenie */}
      {canApprove && (
        <Card className="border-zinc-800 bg-zinc-900/90 shadow-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-zinc-800/80">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                    Kolejka wniosków o dołączenie
                    {pendingRequests.length > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-600/40 text-xs px-2 py-0.5">
                        {pendingRequests.length} oczekujących
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-zinc-400">
                  Użytkownicy, którzy zarejestrowali się przy użyciu kodu zaproszenia i czekają na akceptację oraz nadanie posady przez administratora.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-6">
            {/* Oczekujące wnioski */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Oczekujące na decyzję ({pendingRequests.length})
              </h3>

              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs space-y-1">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-2" />
                  <p className="font-semibold text-zinc-300">Wszystkie wnioski zostały rozpatrzone!</p>
                  <p>Brak oczekujących próśb o dołączenie do organizacji.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400">
                        <th className="py-3 px-4 font-semibold">Użytkownik</th>
                        <th className="py-3 px-4 font-semibold">Adres e-mail</th>
                        <th className="py-3 px-4 font-semibold">Użyty kod</th>
                        <th className="py-3 px-4 font-semibold">Sugerowana posada</th>
                        <th className="py-3 px-4 font-semibold">Data zgłoszenia</th>
                        <th className="py-3 px-4 font-semibold text-right min-w-[200px]">Decyzja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {pendingRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                user={{
                                  first_name: req.first_name,
                                  last_name: req.last_name,
                                  avatar_color: req.avatar_color,
                                }}
                                size="sm"
                              />
                              <span className="font-semibold text-zinc-100">
                                {req.first_name} {req.last_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-zinc-300 font-mono text-[11px]">
                            {req.email}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-sky-400">
                            {req.invitation_code || 'Brak'}
                          </td>
                          <td className="py-3 px-4 text-zinc-300">
                            {req.assigned_position_name || (
                              <span className="text-zinc-500 italic">Do ustalenia</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-400">
                            {new Date(req.created_at).toLocaleString('pl-PL')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleOpenApproveDialog(req)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1 h-8"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                Zatwierdź
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={rejectingId === req.id}
                                onClick={() => handleRejectRequest(req)}
                                className="border-red-900/60 bg-red-950/20 hover:bg-red-950 text-red-300 text-xs gap-1 h-8"
                              >
                                {rejectingId === req.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5" />
                                )}
                                Odrzuć
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Historia rozpatrzonych wniosków */}
            {reviewedRequests.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-zinc-800/80">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Rozpatrzone wnioski ({reviewedRequests.length})
                </h3>

                <div className="rounded-xl border border-zinc-800 overflow-x-auto opacity-75">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400">
                        <th className="py-2.5 px-3 font-semibold">Użytkownik</th>
                        <th className="py-2.5 px-3 font-semibold">Adres e-mail</th>
                        <th className="py-2.5 px-3 font-semibold">Przypisana posada</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-3 font-semibold">Data rozpatrzenia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {reviewedRequests.slice(0, 10).map((req) => (
                        <tr key={req.id}>
                          <td className="py-2.5 px-3 font-medium text-zinc-300">
                            {req.first_name} {req.last_name}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">
                            {req.email}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400">
                            {req.assigned_position_name || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            {req.status === 'approved' ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-950 text-emerald-400 border-emerald-800">
                                Zatwierdzony
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-red-950 text-red-400 border-red-800">
                                Odrzucony
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 text-[11px]">
                            {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString('pl-PL') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog wyboru posady przy zatwierdzaniu użytkownika */}
      <Dialog
        open={Boolean(requestToApprove)}
        onOpenChange={(open) => {
          if (!open) setRequestToApprove(null)
        }}
      >
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-5 py-3">
            <span className="text-xs font-semibold text-zinc-400">
              Zatwierdzenie nowego członka organizacji
            </span>
          </div>

          <div className="p-6 space-y-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold text-zinc-100">
                Przydziel posadę dla {requestToApprove?.first_name} {requestToApprove?.last_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Użytkownik otrzyma konto aktywne oraz uprawnienia wynikające z wybranego stanowiska.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="assign-pos" className="text-xs text-zinc-300">
                Wybierz posadę w organizacji:
              </Label>
              <Select
                value={approvePositionId}
                onValueChange={setApprovePositionId}
              >
                <SelectTrigger id="assign-pos" className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100">
                  <SelectValue placeholder="Wybierz stanowisko" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} (Priorytet: {p.priority})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRequestToApprove(null)}
                className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs"
              >
                Anuluj
              </Button>
              <Button
                type="button"
                disabled={isSubmittingApproval}
                onClick={handleConfirmApproval}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
              >
                {isSubmittingApproval ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                Zatwierdź i aktywuj konto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
