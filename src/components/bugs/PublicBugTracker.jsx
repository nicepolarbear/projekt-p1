import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  ImageIcon,
  Layers,
  Loader2,
  LogIn,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/utils'
import { bugService } from '../../services/bugService'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { Textarea } from '../ui/textarea'
import { ReportBugWizard } from './ReportBugWizard'

const STATUS_STEPS = [
  { key: 'new', label: 'Zgłoszone', desc: 'Oczekuje na weryfikację' },
  { key: 'in_analysis', label: 'W analizie', desc: 'Zespół sprawdza błąd' },
  { key: 'in_progress', label: 'W naprawie', desc: 'Programista usuwa usterkę' },
  { key: 'resolved', label: 'Naprawione', desc: 'Poprawka została wdrożona' },
]

function getStatusStepIndex(status) {
  switch (status) {
    case 'new':
      return 0
    case 'in_analysis':
      return 1
    case 'in_progress':
      return 2
    case 'resolved':
      return 3
    case 'rejected':
      return -1
    default:
      return 0
  }
}

export function PublicBugTracker({ initialCode = '', onBackToLogin }) {
  const { toast } = useToast()

  const [trackingCode, setTrackingCode] = useState(initialCode)
  const [searchInput, setSearchInput] = useState(initialCode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [bugData, setBugData] = useState(null)
  const [comments, setComments] = useState([])
  const [linkedTasks, setLinkedTasks] = useState([])

  // New comment state
  const [guestName, setGuestName] = useState('')
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  // Report wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  // Read URL query or hash on mount
  useEffect(() => {
    if (initialCode) {
      setTrackingCode(initialCode)
      setSearchInput(initialCode)
      return
    }

    const hash = window.location.hash || ''
    const match = hash.match(/track=([A-Za-z0-9_-]+)/)
    if (match && match[1]) {
      setTrackingCode(match[1])
      setSearchInput(match[1])
      return
    }

    const searchParams = new URLSearchParams(window.location.search)
    const qTrack = searchParams.get('track')
    if (qTrack) {
      setTrackingCode(qTrack)
      setSearchInput(qTrack)
    }
  }, [initialCode])

  const fetchBugDetails = useCallback(
    async (codeToFetch) => {
      const clean = (codeToFetch || '').trim().toUpperCase()
      if (!clean) return

      setIsLoading(true)
      setError(null)

      try {
        const data = await bugService.trackBugByCode(clean)
        setBugData(data.bug)
        setComments(data.comments || [])
        setLinkedTasks(data.linked_tasks || [])
      } catch (err) {
        setBugData(null)
        setComments([])
        setLinkedTasks([])
        setError(
          err?.status === 404
            ? `Nie znaleziono zgłoszenia o kodzie "${clean}". Sprawdź poprawność kodu.`
            : err?.message || 'Nie udało się pobrać danych zgłoszenia.'
        )
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (trackingCode) {
      fetchBugDetails(trackingCode)
    }
  }, [trackingCode, fetchBugDetails])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const clean = searchInput.trim().toUpperCase()
    if (!clean) return
    setTrackingCode(clean)
    window.location.hash = `track=${clean}`
  }

  const handleSendComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !trackingCode) return

    setIsSubmittingComment(true)
    try {
      const res = await bugService.addPublicComment(trackingCode, {
        content: newComment.trim(),
        author_name: guestName.trim() || undefined,
      })

      if (res.comment) {
        setComments((prev) => [...prev, res.comment])
        setNewComment('')
        toast({
          title: 'Wiadomość wysłana',
          description: 'Twój komentarz został dołączony do zgłoszenia.',
        })
      }
    } catch (err) {
      toast({
        title: 'Błąd wysyłania',
        description: err?.message || 'Nie udało się dodać komentarza.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const currentStep = bugData ? getStatusStepIndex(bugData.status) : 0

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-950 border border-sky-800 text-sky-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-100">TaskFlow</span>
              <span className="text-xs text-zinc-400 hidden sm:inline"> • Publiczny Monitor Zgłoszeń</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsWizardOpen(true)}
            className="bg-sky-600 hover:bg-sky-500 text-white text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Zgłoś nowy błąd</span>
            <span className="sm:hidden">Zgłoś błąd</span>
          </Button>

          {onBackToLogin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToLogin}
              className="border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-xs gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Zaloguj się</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Search Bar Banner */}
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
            Śledź status swojego zgłoszenia
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
            Wpisz kod śledzenia (np. <span className="font-mono text-sky-400">BUG-4821</span>) otrzymany podczas zgłaszania problemu, aby sprawdzić postęp prac i rozmawiać z inżynierami.
          </p>

          <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Wpisz kod BUG-XXXX..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-zinc-950 border-zinc-700 text-zinc-100 font-mono tracking-wider text-sm uppercase"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !searchInput.trim()}
              className="bg-sky-600 hover:bg-sky-500 text-white gap-1.5 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Sprawdź
            </Button>
          </form>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="py-16 text-center text-zinc-400 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-sky-400" />
            <p className="text-xs">Wyszukiwanie zgłoszenia w bazie...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && !isLoading && (
          <div className="p-4 rounded-xl border border-red-800/80 bg-red-950/40 text-red-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-sm">Nie odnaleziono zgłoszenia</p>
              <p className="text-zinc-300">{error}</p>
            </div>
          </div>
        )}

        {/* Bug Details Display */}
        {bugData && !isLoading && (
          <div className="space-y-6">
            {/* Status Progress Bar Card */}
            <Card className="border-zinc-800 bg-zinc-900/90 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400">Identyfikator:</span>
                  <Badge variant="outline" className="font-mono text-sm bg-sky-950/80 text-sky-300 border-sky-700 font-bold px-2.5 py-0.5">
                    {bugData.tracking_code}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchBugDetails(bugData.tracking_code)}
                    className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Odśwież
                  </Button>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Stepper or Rejected banner */}
                {bugData.status === 'rejected' ? (
                  <div className="p-4 rounded-xl border border-red-800 bg-red-950/40 space-y-2">
                    <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Zgłoszenie zostało odrzucone</span>
                    </div>
                    {bugData.rejection_reason && (
                      <p className="text-xs text-red-200 pl-7 leading-relaxed">
                        <strong className="text-red-300">Powód odrzucenia:</strong> {bugData.rejection_reason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Aktualny etap realizacji:
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      {STATUS_STEPS.map((s, idx) => {
                        const isDone = currentStep >= idx
                        const isCurrent = currentStep === idx
                        return (
                          <div
                            key={s.key}
                            className={cn(
                              'p-3 rounded-xl border flex flex-col gap-1 transition-all',
                              isCurrent
                                ? 'border-sky-500 bg-sky-950/40 text-sky-100 shadow-md shadow-sky-950/40 ring-1 ring-sky-500'
                                : isDone
                                  ? 'border-emerald-800/80 bg-emerald-950/20 text-emerald-200'
                                  : 'border-zinc-800 bg-zinc-950/40 text-zinc-500'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold">
                                {idx + 1}. {s.label}
                              </span>
                              {isDone && !isCurrent ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : isCurrent ? (
                                <Clock className="h-4 w-4 text-sky-400 animate-pulse" />
                              ) : null}
                            </div>
                            <span className="text-[10px] text-zinc-400 leading-tight">
                              {s.desc}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Bug summary details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="md:col-span-2 space-y-3">
                    <h2 className="text-lg font-bold text-zinc-100 leading-snug">
                      {bugData.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Severity badge */}
                      {bugData.severity === 'critical' && (
                        <Badge className="bg-red-950 text-red-300 border-red-700 animate-pulse">
                          Waga: Krytyczna
                        </Badge>
                      )}
                      {bugData.severity === 'high' && (
                        <Badge className="bg-amber-950 text-amber-300 border-amber-800">
                          Waga: Wysoka
                        </Badge>
                      )}
                      {bugData.severity === 'normal' && (
                        <Badge className="bg-blue-950 text-blue-300 border-blue-800">
                          Waga: Normalna
                        </Badge>
                      )}
                      {bugData.severity === 'low' && (
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                          Waga: Niska
                        </Badge>
                      )}

                      {/* Application / URL */}
                      {bugData.application_name && (
                        <span className="flex items-center gap-1 text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                          <Globe className="h-3 w-3 text-sky-400" />
                          {bugData.application_name}
                        </span>
                      )}
                      {bugData.custom_url && (
                        <a
                          href={bugData.custom_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-sky-400 hover:underline bg-zinc-800/80 px-2 py-0.5 rounded truncate max-w-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {bugData.custom_url}
                        </a>
                      )}
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {bugData.description}
                    </div>

                    {bugData.attachment_url && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
                          Załączony zrzut ekranu:
                        </span>
                        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950 max-h-80">
                          <img
                            src={bugData.attachment_url}
                            alt="Zrzut ekranu błędu"
                            className="max-h-80 w-auto object-contain mx-auto"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          <div className="p-2 bg-zinc-900 border-t border-zinc-800 text-right">
                            <a
                              href={bugData.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1"
                            >
                              Otwórz załącznik w nowej karcie
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar Metadata & Tasks */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3 text-xs">
                      <span className="font-semibold text-zinc-300 block border-b border-zinc-800 pb-2">
                        Metadane zgłoszenia
                      </span>
                      <div className="space-y-2 text-zinc-400">
                        <div className="flex justify-between">
                          <span>Data zgłoszenia:</span>
                          <span className="text-zinc-200">
                            {new Date(bugData.created_at).toLocaleDateString('pl-PL')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Zgłaszający:</span>
                          <span className="text-zinc-200">
                            {bugData.is_anonymous ? 'Anonim' : bugData.guest_name || 'Użytkownik'}
                          </span>
                        </div>
                        {bugData.organization_name && (
                          <div className="flex justify-between">
                            <span>Organizacja:</span>
                            <span className="text-zinc-200">{bugData.organization_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {linkedTasks.length > 0 && (
                      <div className="rounded-xl border border-indigo-900/60 bg-indigo-950/20 p-4 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                          <ShieldCheck className="h-4 w-4" />
                          <span>Powiązane zadanie TaskFlow</span>
                        </div>
                        {linkedTasks.map((t) => (
                          <div key={t.id} className="p-2 rounded bg-zinc-900/80 border border-zinc-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-zinc-200">Zadanie #{t.id}</span>
                              <Badge variant="outline" className="text-[10px] bg-indigo-950 text-indigo-300 border-indigo-800">
                                {t.status_name}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">{t.title}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-zinc-800" />

                {/* Comment Thread (Czat zgłoszenia) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-sky-400" />
                      <h3 className="text-sm font-bold text-zinc-100">
                        Czat i wiadomości ze wsparciem ({comments.length})
                      </h3>
                    </div>
                    <span className="text-xs text-zinc-500">
                      Możesz bezpośrednio wymieniać wiadomości z technikami
                    </span>
                  </div>

                  {/* Messages list */}
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                        Brak wiadomości w tym zgłoszeniu. Jeśli masz pytania lub dodatkowe wskazówki, napisz poniżej!
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={cn(
                            'p-3.5 rounded-xl border text-xs space-y-1.5 transition-colors',
                            comment.is_staff
                              ? 'border-sky-800/80 bg-sky-950/20 text-zinc-200 shadow-sm'
                              : 'border-zinc-800 bg-zinc-950 text-zinc-300'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-100">
                                {comment.author_name || 'Użytkownik'}
                              </span>
                              {comment.is_staff && (
                                <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/40 text-[10px] px-1.5 py-0 font-medium">
                                  Zespół TaskFlow
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500">
                              {new Date(comment.created_at).toLocaleString('pl-PL')}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendComment} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
                    <span className="text-xs font-semibold text-zinc-300 block">
                      Napisz wiadomość do zespołu technicznego:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-1">
                        <Input
                          placeholder="Twoje imię / podpis..."
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <div className="relative">
                          <Textarea
                            placeholder="Wpisz treść wiadomości lub dodatkowe szczegóły..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={2}
                            className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 resize-none pr-12"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={isSubmittingComment || !newComment.trim()}
                            className="absolute right-2 bottom-2 h-7 bg-sky-600 hover:bg-sky-500 text-white text-xs px-2.5 gap-1"
                          >
                            {isSubmittingComment ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Wyślij
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-4 text-center text-xs text-zinc-500">
        TaskFlow Bug Tracker • Bezpieczny system obsługi zgłoszeń
      </footer>

      {/* Bug Reporting Wizard Dialog */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto">
          <ReportBugWizard
            onClose={() => setIsWizardOpen(false)}
            onReturnToHome={() => setIsWizardOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
