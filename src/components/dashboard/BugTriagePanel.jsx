import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightCircle,
  Bug,
  Globe,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { canConvertBugsToTasks, canTriageBugs } from '../../lib/permissions'
import { cn } from '../../lib/utils'
import { bugService } from '../../services/bugService'
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
import { Textarea } from '../ui/textarea'
import { ConvertBugToTaskDialog } from './ConvertBugToTaskDialog'

const STATUS_OPTIONS = [
  { id: 'new', label: 'Nowe', color: 'bg-sky-950/70 text-sky-400 border-sky-800' },
  { id: 'in_analysis', label: 'W analizie', color: 'bg-amber-950/70 text-amber-400 border-amber-800' },
  { id: 'in_progress', label: 'W trakcie naprawy', color: 'bg-indigo-950/70 text-indigo-400 border-indigo-800' },
  { id: 'resolved', label: 'Naprawione', color: 'bg-emerald-950/70 text-emerald-400 border-emerald-800' },
  { id: 'rejected', label: 'Odrzucone', color: 'bg-rose-950/70 text-rose-400 border-rose-800' },
]

const SEVERITY_OPTIONS = [
  { id: 'all', label: 'Wszystkie wagi' },
  { id: 'critical', label: 'Krytyczny', color: 'text-red-400' },
  { id: 'high', label: 'Wysoki', color: 'text-amber-400' },
  { id: 'normal', label: 'Normalny', color: 'text-blue-400' },
  { id: 'low', label: 'Niski', color: 'text-zinc-400' },
]

export function BugTriagePanel({ refreshSignal, onTaskCreated }) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [bugs, setBugs] = useState([])
  const [apps, setApps] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [appFilter, setAppFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected Bug for Chat / Details Drawer
  const [activeBug, setActiveBug] = useState(null)
  const [bugComments, setBugComments] = useState([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [newStaffComment, setNewStaffComment] = useState('')
  const [isSendingComment, setIsSendingComment] = useState(false)

  // Rejection dialog
  const [rejectDialogBug, setRejectDialogBug] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  // Convert to task dialog
  const [convertDialogBug, setConvertDialogBug] = useState(null)

  const canTriage = canTriageBugs(user)
  const canConvert = canConvertBugsToTasks(user)

  const loadBugs = useCallback(async () => {
    if (!canTriage) return
    setIsLoading(true)
    setError(null)
    try {
      const filters = {}
      if (statusFilter !== 'all') filters.status = statusFilter
      if (severityFilter !== 'all') filters.severity = severityFilter
      if (appFilter !== 'all') filters.application_id = Number(appFilter)
      if (searchQuery.trim()) filters.search = searchQuery.trim()

      const [bugsData, appsData] = await Promise.all([
        bugService.getOrganizationBugs(filters),
        bugService.getPublicApplications().catch(() => ({ applications: [] })),
      ])

      setBugs(bugsData.bugs || [])
      setApps(appsData.applications || [])
    } catch (err) {
      setError(err?.message || 'Nie udało się pobrać zgłoszeń błędów.')
    } finally {
      setIsLoading(false)
    }
  }, [canTriage, statusFilter, severityFilter, appFilter, searchQuery])

  useEffect(() => {
    loadBugs()
  }, [loadBugs, refreshSignal])

  // Load comments when activeBug is selected
  const loadComments = useCallback(
    async (code) => {
      if (!code) return
      setIsLoadingComments(true)
      try {
        const data = await bugService.trackBugByCode(code)
        setBugComments(data.comments || [])
      } catch (err) {
        toast({
          title: 'Błąd ładowania czatu',
          description: err?.message || 'Nie udało się pobrać komentarzy.',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingComments(false)
      }
    },
    [toast]
  )

  const handleOpenChat = (bug) => {
    setActiveBug(bug)
    setNewStaffComment('')
    loadComments(bug.tracking_code)
  }

  // Handle status change
  const handleStatusChange = async (bug, newStatus) => {
    if (newStatus === 'rejected') {
      setRejectDialogBug(bug)
      setRejectionReason('')
      return
    }

    try {
      await bugService.updateBugStatus(bug.id, { status: newStatus })
      setBugs((prev) =>
        prev.map((b) => (b.id === bug.id ? { ...b, status: newStatus } : b))
      )
      toast({
        title: 'Status zaktualizowany',
        description: `Zgłoszenie ${bug.tracking_code} otrzymało status: ${
          STATUS_OPTIONS.find((s) => s.id === newStatus)?.label || newStatus
        }.`,
      })
    } catch (err) {
      toast({
        title: 'Błąd zmiany statusu',
        description: err?.message || 'Nie udało się zaktualizować statusu.',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmRejection = async () => {
    if (!rejectDialogBug) return
    setIsRejecting(true)
    try {
      await bugService.updateBugStatus(rejectDialogBug.id, {
        status: 'rejected',
        rejection_reason: rejectionReason.trim() || undefined,
      })

      setBugs((prev) =>
        prev.map((b) =>
          b.id === rejectDialogBug.id
            ? {
                ...b,
                status: 'rejected',
                rejection_reason: rejectionReason.trim() || null,
              }
            : b
        )
      )

      toast({
        title: 'Zgłoszenie odrzucone',
        description: `Zgłoszenie ${rejectDialogBug.tracking_code} zostało oznaczone jako odrzucone.`,
      })
      setRejectDialogBug(null)
    } catch (err) {
      toast({
        title: 'Błąd odrzucenia',
        description: err?.message || 'Nie udało się odrzucić zgłoszenia.',
        variant: 'destructive',
      })
    } finally {
      setIsRejecting(false)
    }
  }

  // Send staff comment
  const handleSendStaffComment = async (e) => {
    e.preventDefault()
    if (!newStaffComment.trim() || !activeBug) return

    setIsSendingComment(true)
    try {
      const res = await bugService.addStaffComment(activeBug.id, {
        content: newStaffComment.trim(),
      })

      if (res.comment) {
        setBugComments((prev) => [...prev, res.comment])
        setNewStaffComment('')
        toast({
          title: 'Wiadomość wysłana',
          description: 'Komentarz zespołu został dodany.',
        })
      }
    } catch (err) {
      toast({
        title: 'Błąd wysyłania',
        description: err?.message || 'Nie udało się wysłać komentarza.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingComment(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <Card className="border-zinc-800 bg-zinc-900/90 shadow-xl overflow-hidden">
        <CardHeader className="p-5 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-950 border border-sky-800 text-sky-400">
                <Bug className="h-5 w-5" />
              </div>
              <CardTitle className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                Triage i Zgłoszenia Błędów
                <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-300 border-zinc-700">
                  {bugs.length} zgłoszeń
                </Badge>
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Przeglądaj raporty usterek, zmieniaj ich statusy, odpowiadaj użytkownikom na czacie i przekształcaj błędy bezpośrednio w zadania TaskFlow.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadBugs}
            disabled={isLoading}
            className="border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-xs gap-1.5 shrink-0"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Odśwież
          </Button>
        </CardHeader>

        {/* Filtry */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Status filter */}
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-400">Status zgłoszenia:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 h-8">
                <SelectValue placeholder="Wszystkie statusy" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity filter */}
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-400">Waga usterki:</Label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 h-8">
                <SelectValue placeholder="Wszystkie wagi" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id} className={s.color}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Application filter */}
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-400">Aplikacja / Serwis:</Label>
            <Select value={appFilter} onValueChange={setAppFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 h-8">
                <SelectValue placeholder="Wszystkie aplikacje" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <SelectItem value="all">Wszystkie aplikacje</SelectItem>
                {apps.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Text search */}
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-400">Wyszukaj:</Label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Szukaj po tytule, kodzie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-zinc-900 border-zinc-800 text-xs text-zinc-200 h-8"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center text-zinc-400 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-sky-400" />
              <p className="text-xs">Ładowanie zgłoszeń błędów...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-red-300 space-y-2">
              <AlertCircle className="h-6 w-6 text-red-400 mx-auto" />
              <p>{error}</p>
            </div>
          ) : bugs.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs space-y-2">
              <Bug className="h-6 w-6 mx-auto text-zinc-600 mb-1" />
              <p className="font-semibold text-zinc-300">Brak zgłoszeń błędów</p>
              <p>Nie odnaleziono zgłoszeń spełniających wybrane kryteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400">
                    <th className="py-3 px-4 font-semibold">Kod i waga</th>
                    <th className="py-3 px-4 font-semibold min-w-[200px]">Tytuł i aplikacja</th>
                    <th className="py-3 px-4 font-semibold">Zgłaszający</th>
                    <th className="py-3 px-4 font-semibold min-w-[150px]">Status</th>
                    <th className="py-3 px-4 font-semibold">Powiązanie</th>
                    <th className="py-3 px-4 font-semibold text-right min-w-[210px]">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {bugs.map((bug) => {
                    const statusCfg =
                      STATUS_OPTIONS.find((s) => s.id === bug.status) || STATUS_OPTIONS[0]
                    const isConverted = Boolean(bug.linked_task_id)

                    return (
                      <tr key={bug.id} className="hover:bg-zinc-800/30 transition-colors">
                        {/* Kod i waga */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60 w-fit">
                              {bug.tracking_code}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] px-1.5 py-0 w-fit font-normal capitalize',
                                bug.severity === 'critical'
                                  ? 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                                  : bug.severity === 'high'
                                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                                    : bug.severity === 'normal'
                                      ? 'bg-blue-950 text-blue-300 border-blue-800'
                                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                              )}
                            >
                              {bug.severity}
                            </Badge>
                          </div>
                        </td>

                        {/* Tytuł i aplikacja */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-zinc-100 max-w-sm truncate">
                              {bug.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                              <Globe className="h-3 w-3 text-zinc-500 shrink-0" />
                              <span className="truncate max-w-[220px]">
                                {bug.application_name || bug.custom_url || 'Zewnętrzny serwis'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Zgłaszający */}
                        <td className="py-3 px-4 text-zinc-300">
                          <div className="space-y-0.5">
                            <p className="font-medium text-zinc-200">
                              {bug.is_anonymous
                                ? 'Anonim'
                                : bug.reporter_first_name
                                  ? `${bug.reporter_first_name} ${bug.reporter_last_name}`
                                  : bug.guest_name || 'Gość'}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              {bug.reporter_email || bug.guest_email || 'Brak emaila'}
                            </p>
                          </div>
                        </td>

                        {/* Status (Inline changer) */}
                        <td className="py-3 px-4">
                          <Select
                            value={bug.status}
                            onValueChange={(val) => handleStatusChange(bug, val)}
                          >
                            <SelectTrigger
                              className={cn('text-xs h-7 w-36 border font-medium', statusCfg.color)}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Powiązanie z zadaniem TaskFlow */}
                        <td className="py-3 px-4">
                          {isConverted ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] bg-indigo-950/80 text-indigo-300 border-indigo-700/80 gap-1 font-medium"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Zadanie #{bug.linked_task_id}
                            </Badge>
                          ) : (
                            <span className="text-zinc-600 text-[11px] italic">Brak zadania</span>
                          )}
                        </td>

                        {/* Akcje */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Przycisk czatu */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenChat(bug)}
                              className="h-8 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 gap-1"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Czat ({bug.comments_count || 0})</span>
                            </Button>

                            {/* Przekształć w zadanie */}
                            {canConvert && !isConverted && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setConvertDialogBug(bug)}
                                className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1"
                              >
                                <ArrowRightCircle className="h-3.5 w-3.5" />
                                <span>Do zadania</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer / Modal Czatu ze Zgłaszającym */}
      <Dialog
        open={Boolean(activeBug)}
        onOpenChange={(open) => {
          if (!open) setActiveBug(null)
        }}
      >
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
          {activeBug && (
            <>
              <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400">
                    Czat zgłoszenia ze zgłaszającym
                  </span>
                  <Badge variant="outline" className="font-mono text-xs bg-sky-950 text-sky-400 border-sky-800 font-bold ml-1">
                    {activeBug.tracking_code}
                  </Badge>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-1">
                  <p className="text-xs font-bold text-zinc-100">{activeBug.title}</p>
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    {activeBug.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                    Historia wiadomości ({bugComments.length})
                  </span>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {isLoadingComments ? (
                      <div className="py-8 text-center text-zinc-400 space-y-1">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-sky-400" />
                        <p className="text-xs">Ładowanie wątku czatu...</p>
                      </div>
                    ) : bugComments.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                        Brak wiadomości. Napisz pierwszą wiadomość do zgłaszającego!
                      </div>
                    ) : (
                      bugComments.map((comment) => (
                        <div
                          key={comment.id}
                          className={cn(
                            'p-3 rounded-xl border text-xs space-y-1',
                            comment.is_staff
                              ? 'border-indigo-800/80 bg-indigo-950/20 text-zinc-200'
                              : 'border-zinc-800 bg-zinc-900/80 text-zinc-300'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-zinc-100">
                                {comment.author_name}
                              </span>
                              {comment.is_staff ? (
                                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/40 text-[10px] px-1.5 py-0">
                                  Zespół TaskFlow
                                </Badge>
                              ) : (
                                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-1.5 py-0">
                                  Zgłaszający
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(comment.created_at).toLocaleString('pl-PL')}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Formularz odpowiedzi pracownika */}
                  <form onSubmit={handleSendStaffComment} className="relative pt-2">
                    <Textarea
                      placeholder="Napisz oficjalną odpowiedź zespołu do zgłaszającego..."
                      value={newStaffComment}
                      onChange={(e) => setNewStaffComment(e.target.value)}
                      rows={2}
                      className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 resize-none pr-20"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSendingComment || !newStaffComment.trim()}
                      className="absolute right-2.5 bottom-2.5 h-7 bg-sky-600 hover:bg-sky-500 text-white text-xs px-2.5 gap-1"
                    >
                      {isSendingComment ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Wyślij
                    </Button>
                  </form>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Odrzucenia Zgłoszenia */}
      <Dialog
        open={Boolean(rejectDialogBug)}
        onOpenChange={(open) => {
          if (!open) setRejectDialogBug(null)
        }}
      >
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              Odrzucenie zgłoszenia {rejectDialogBug?.tracking_code}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Podaj powód odrzucenia, aby zgłaszający wiedział, dlaczego usterka nie zostanie naprawiona (np. błąd nie do odtworzenia, zachowanie zamierzone).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="rej-reason" className="text-xs text-zinc-300">
              Powód odrzucenia (widoczny dla zgłaszającego):
            </Label>
            <Textarea
              id="rej-reason"
              placeholder="np. Funkcjonalność działa zgodnie ze specyfikacją lub brak wystarczających kroków do odtworzenia."
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectDialogBug(null)}
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs"
            >
              Anuluj
            </Button>
            <Button
              type="button"
              disabled={isRejecting}
              onClick={handleConfirmRejection}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1"
            >
              {isRejecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              Odrzuć zgłoszenie
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Konwersji na Zadanie */}
      <ConvertBugToTaskDialog
        open={Boolean(convertDialogBug)}
        onOpenChange={(open) => {
          if (!open) setConvertDialogBug(null)
        }}
        bug={convertDialogBug}
        onConverted={(res) => {
          setBugs((prev) =>
            prev.map((b) =>
              b.id === convertDialogBug.id
                ? {
                    ...b,
                    status: 'in_progress',
                    linked_task_id: res.task.id,
                  }
                : b
            )
          )
          if (onTaskCreated) onTaskCreated(res.task)
        }}
      />
    </div>
  )
}
