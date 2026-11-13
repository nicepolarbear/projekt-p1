import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  Globe,
  ImageIcon,
  Layers,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  User,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/utils'
import { bugService } from '../../services/bugService'
import { ReportBugWizard } from '../bugs/ReportBugWizard'
import { Avatar } from '../shared/Avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
} from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'

const STATUS_CONFIG = {
  new: {
    label: 'Nowe',
    color: 'bg-sky-950/60 text-sky-400 border-sky-800/60',
    stepIdx: 0,
  },
  in_analysis: {
    label: 'W analizie',
    color: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    stepIdx: 1,
  },
  in_progress: {
    label: 'W trakcie naprawy',
    color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
    stepIdx: 2,
  },
  resolved: {
    label: 'Naprawione',
    color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    stepIdx: 3,
  },
  rejected: {
    label: 'Odrzucone',
    color: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
    stepIdx: -1,
  },
}

const SEVERITY_CONFIG = {
  low: { label: 'Niski', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  normal: { label: 'Normalny', color: 'bg-blue-950/60 text-blue-300 border-blue-800/60' },
  high: { label: 'Wysoki', color: 'bg-amber-950/60 text-amber-300 border-amber-800/60' },
  critical: { label: 'Krytyczny', color: 'bg-red-950/80 text-red-300 border-red-700 animate-pulse' },
}

const PROGRESS_STEPS = [
  { key: 'new', label: 'Zgłoszone' },
  { key: 'in_analysis', label: 'W analizie' },
  { key: 'in_progress', label: 'W naprawie' },
  { key: 'resolved', label: 'Naprawione' },
]

export function ReporterPortal({ onOpenProfile }) {
  const { user, logout } = useAuth()
  const { toast } = useToast()

  const [bugs, setBugs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // all, in_progress, resolved, rejected
  const [searchQuery, setSearchQuery] = useState('')

  // Wizard modal
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  // Detail Modal / Drawer
  const [selectedBug, setSelectedBug] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSendingComment, setIsSendingComment] = useState(false)

  const loadBugs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await bugService.getMyBugs()
      setBugs(data.bugs || [])
    } catch (err) {
      setError(err?.message || 'Nie udało się pobrać Twoich zgłoszeń.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBugs()
  }, [loadBugs])

  // Load detail and comments when selectedBug changes
  const loadBugDetail = useCallback(async (code) => {
    if (!code) return
    setIsLoadingDetail(true)
    try {
      const data = await bugService.trackBugByCode(code)
      setDetailData(data)
    } catch (err) {
      toast({
        title: 'Błąd ładowania szczegółów',
        description: err?.message || 'Nie udało się pobrać danych zgłoszenia.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingDetail(false)
    }
  }, [toast])

  const handleOpenBugDetail = (bug) => {
    setSelectedBug(bug)
    setNewComment('')
    loadBugDetail(bug.tracking_code)
  }

  const handleSendComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedBug) return

    setIsSendingComment(true)
    try {
      const res = await bugService.addPublicComment(selectedBug.tracking_code, {
        content: newComment.trim(),
      })

      if (res.comment) {
        setDetailData((prev) =>
          prev
            ? {
                ...prev,
                comments: [...(prev.comments || []), res.comment],
              }
            : null
        )
        setNewComment('')
        toast({
          title: 'Wiadomość wysłana',
          description: 'Twój komentarz został pomyślnie dodany do zgłoszenia.',
        })
      }
    } catch (err) {
      toast({
        title: 'Błąd wysyłania',
        description: err?.message || 'Nie udało się dodać komentarza.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingComment(false)
    }
  }

  // Filtered bugs
  const filteredBugs = bugs.filter((bug) => {
    // Status tab filter
    if (activeTab === 'in_progress') {
      if (bug.status === 'resolved' || bug.status === 'rejected') return false
    } else if (activeTab === 'resolved') {
      if (bug.status !== 'resolved') return false
    } else if (activeTab === 'rejected') {
      if (bug.status !== 'rejected') return false
    }

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const titleMatch = bug.title?.toLowerCase().includes(q)
      const codeMatch = bug.tracking_code?.toLowerCase().includes(q)
      const appMatch = (bug.application_name || bug.custom_url)?.toLowerCase().includes(q)
      if (!titleMatch && !codeMatch && !appMatch) return false
    }

    return true
  })

  const inProgressCount = bugs.filter(
    (b) => b.status === 'new' || b.status === 'in_analysis' || b.status === 'in_progress'
  ).length
  const resolvedCount = bugs.filter((b) => b.status === 'resolved').length
  const rejectedCount = bugs.filter((b) => b.status === 'rejected').length

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Użytkownik'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo and title */}
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
              <span className="text-xs text-zinc-400"> • Portal Zgłaszającego</span>
            </div>
          </div>
        </div>

        {/* CTA and User Profile */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsWizardOpen(true)}
            className="bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Zgłoś nowy błąd</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-2 gap-2 rounded-lg hover:bg-zinc-800 border border-transparent hover:border-zinc-700/60"
              >
                <Avatar user={user} size="sm" />
                <span className="text-xs font-medium text-zinc-200 hidden sm:inline">
                  {fullName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2.5 py-2">
                <p className="text-sm font-semibold text-zinc-100 truncate">{fullName}</p>
                <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
                <Badge variant="outline" className="mt-1.5 text-[10px] bg-sky-950/60 text-sky-400 border-sky-800">
                  Zgłaszający usterki
                </Badge>
              </div>
              <DropdownMenuSeparator />
              {onOpenProfile && (
                <DropdownMenuItem onClick={onOpenProfile} className="cursor-pointer gap-2">
                  <User className="h-4 w-4 text-zinc-400" />
                  <span>Mój profil</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => void logout()}
                className="cursor-pointer gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/40"
              >
                <LogOut className="h-4 w-4" />
                <span>Wyloguj się</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Welcome Card */}
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-sky-950/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Witaj, {user?.first_name || 'Użytkowniku'}!
            </h1>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
              Tutaj możesz śledzić status zgłoszonych usterek, sprawdzić postęp ich rozwiązywania przez inżynierów oraz bezpośrednio rozmawiać z zespołem technicznym w czacie zgłoszenia.
            </p>
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
            Odśwież zgłoszenia
          </Button>
        </div>

        {/* Tabs and Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="bg-zinc-900 border border-zinc-800 p-1 flex">
              <TabsTrigger value="all" className="text-xs gap-1.5 py-1.5 px-3">
                Wszystkie
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {bugs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs gap-1.5 py-1.5 px-3">
                W toku
                {inProgressCount > 0 && (
                  <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-sky-950 text-sky-400 border-sky-800">
                    {inProgressCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved" className="text-xs gap-1.5 py-1.5 px-3">
                Rozwiązane
                {resolvedCount > 0 && (
                  <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-emerald-950 text-emerald-400 border-emerald-800">
                    {resolvedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs gap-1.5 py-1.5 px-3">
                Odrzucone
                {rejectedCount > 0 && (
                  <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-rose-950 text-rose-400 border-rose-800">
                    {rejectedCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative sm:w-64">
            <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Szukaj po tytule lub kodzie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-zinc-900 border-zinc-800 text-xs text-zinc-200"
            />
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-20 text-center text-zinc-400 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-sky-400" />
            <p className="text-xs">Ładowanie Twoich zgłoszeń...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="p-4 rounded-xl border border-red-800/80 bg-red-950/40 text-red-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-sm">Błąd pobierania danych</p>
              <p className="text-zinc-300">{error}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredBugs.length === 0 && (
          <div className="py-16 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30 p-8 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/70 border border-zinc-700 text-zinc-400">
              <Bug className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-sm font-semibold text-zinc-200">
                {searchQuery || activeTab !== 'all'
                  ? 'Brak zgłoszeń spełniających wybrane kryteria'
                  : 'Nie zgłoszono jeszcze żadnych błędów'}
              </h3>
              <p className="text-xs text-zinc-400">
                {searchQuery || activeTab !== 'all'
                  ? 'Spróbuj wyczyścić filtr lub wyszukiwanie.'
                  : 'Zauważyłeś nieprawidłowe działanie aplikacji? Zgłoś to naszemu zespołowi!'}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Zgłoś pierwszy błąd
            </Button>
          </div>
        )}

        {/* Bug Cards Grid */}
        {!isLoading && !error && filteredBugs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBugs.map((bug) => {
              const statusCfg = STATUS_CONFIG[bug.status] || STATUS_CONFIG.new
              const sevCfg = SEVERITY_CONFIG[bug.severity] || SEVERITY_CONFIG.normal

              return (
                <div
                  key={bug.id}
                  onClick={() => handleOpenBugDetail(bug)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-900 p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-sm hover:shadow-md group"
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Code + Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                        {bug.tracking_code}
                      </span>
                      <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5', statusCfg.color)}>
                        {statusCfg.label}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug">
                      {bug.title}
                    </h3>

                    {/* App / URL */}
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 truncate">
                      <Globe className="h-3 w-3 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        {bug.application_name || bug.custom_url || 'Zewnętrzny serwis'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Severity, Comments count, Date */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', sevCfg.color)}>
                      {sevCfg.label}
                    </Badge>

                    <div className="flex items-center gap-3">
                      {bug.comments_count > 0 && (
                        <span className="flex items-center gap-1 text-sky-400">
                          <MessageSquare className="h-3 w-3" />
                          {bug.comments_count}
                        </span>
                      )}
                      <span>{new Date(bug.created_at).toLocaleDateString('pl-PL')}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Bug Details Drawer / Modal */}
      <Dialog
        open={Boolean(selectedBug)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBug(null)
            setDetailData(null)
          }
        }}
      >
        <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
          {selectedBug && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-3 w-3 rounded-full bg-red-500/80" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <span className="h-3 w-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-400 pl-2">
                    Szczegóły zgłoszenia
                  </span>
                  <Badge variant="outline" className="font-mono text-xs bg-sky-950 text-sky-400 border-sky-800 font-bold ml-2">
                    {selectedBug.tracking_code}
                  </Badge>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Stepper or rejection banner */}
                {selectedBug.status === 'rejected' ? (
                  <div className="p-4 rounded-xl border border-red-800 bg-red-950/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Zgłoszenie zostało odrzucone</span>
                    </div>
                    {detailData?.bug?.rejection_reason && (
                      <p className="text-xs text-red-200 pl-7 leading-relaxed">
                        <strong>Powód odrzucenia:</strong> {detailData.bug.rejection_reason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Status realizacji:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {PROGRESS_STEPS.map((step, idx) => {
                        const stepIdx = STATUS_CONFIG[selectedBug.status]?.stepIdx ?? 0
                        const isDone = stepIdx >= idx
                        const isCurrent = stepIdx === idx
                        return (
                          <div
                            key={step.key}
                            className={cn(
                              'p-2.5 rounded-xl border flex flex-col gap-1 transition-all',
                              isCurrent
                                ? 'border-sky-500 bg-sky-950/40 text-sky-100 ring-1 ring-sky-500'
                                : isDone
                                  ? 'border-emerald-800/80 bg-emerald-950/20 text-emerald-200'
                                  : 'border-zinc-800 bg-zinc-950/40 text-zinc-500'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold">
                                {idx + 1}. {step.label}
                              </span>
                              {isDone && !isCurrent ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : isCurrent ? (
                                <Clock className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Bug title & metadata */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-zinc-100 leading-snug">
                    {selectedBug.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className={cn('text-xs px-2 py-0.5', STATUS_CONFIG[selectedBug.status]?.color)}>
                      {STATUS_CONFIG[selectedBug.status]?.label}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs px-2 py-0.5', SEVERITY_CONFIG[selectedBug.severity]?.color)}>
                      {SEVERITY_CONFIG[selectedBug.severity]?.label}
                    </Badge>
                    <span className="text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      {selectedBug.application_name || selectedBug.custom_url || 'Brak serwisu'}
                    </span>
                    <span className="text-zinc-500 text-[11px]">
                      Zgłoszono: {new Date(selectedBug.created_at).toLocaleDateString('pl-PL')}
                    </span>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {selectedBug.description}
                  </div>

                  {selectedBug.attachment_url && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
                        Załączony zrzut ekranu:
                      </span>
                      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950 max-h-72">
                        <img
                          src={selectedBug.attachment_url}
                          alt="Załącznik do błędu"
                          className="max-h-72 w-auto object-contain mx-auto"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="bg-zinc-800" />

                {/* Interactive Comment Thread (Czat zgłoszenia) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-sky-400" />
                      <h3 className="text-sm font-bold text-zinc-100">
                        Czat zgłoszenia z zespołem technicznym
                      </h3>
                    </div>
                    {isLoadingDetail && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                    )}
                  </div>

                  {/* Messages */}
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {!detailData || (detailData.comments && detailData.comments.length === 0) ? (
                      <div className="p-5 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                        Brak wiadomości. Możesz napisać poniżej, aby zadać pytanie zespołowi technicznemu.
                      </div>
                    ) : (
                      detailData.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={cn(
                            'p-3.5 rounded-xl border text-xs space-y-1 transition-colors',
                            comment.is_staff
                              ? 'border-sky-800/80 bg-sky-950/20 text-zinc-200'
                              : 'border-zinc-800 bg-zinc-900/80 text-zinc-300'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-100">
                                {comment.author_name}
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

                  {/* Send Form */}
                  <form onSubmit={handleSendComment} className="relative">
                    <Textarea
                      placeholder="Napisz wiadomość lub odpowiedz zespołowi technicznemu..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                      className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 resize-none pr-20"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSendingComment || !newComment.trim()}
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

      {/* Bug Report Wizard Dialog */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto">
          <ReportBugWizard
            onClose={() => {
              setIsWizardOpen(false)
              loadBugs()
            }}
            onReturnToHome={() => {
              setIsWizardOpen(false)
              loadBugs()
            }}
          />
        </div>
      )}
    </div>
  )
}
