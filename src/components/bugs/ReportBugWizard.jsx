import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bug,
  Check,
  CheckCircle2,
  Copy,
  Globe,
  Link2,
  Loader2,
  RotateCcw,
  Shield,
  Upload,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { bugService } from '../../services/bugService'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'

const BUG_DRAFT_KEY = 'taskflow_bug_draft'

const SEVERITIES = [
  {
    id: 'low',
    label: 'Niski',
    badge: '🟢 Niski priorytet',
    desc: 'Drobna usterka wizualna, literówka lub przesunięcie marginesu.',
    borderActive: 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500',
    color: 'text-emerald-400',
  },
  {
    id: 'normal',
    label: 'Normalny',
    badge: '🔵 Domyślny',
    desc: 'Funkcja działa nieprawidłowo, ale nie blokuje całej pracy zespołu.',
    borderActive: 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500',
    color: 'text-sky-400',
  },
  {
    id: 'high',
    label: 'Wysoki',
    badge: '🟠 Pilne',
    desc: 'Poważne utrudnienie w kluczowym module aplikacji.',
    borderActive: 'border-amber-500 bg-amber-950/20 ring-1 ring-amber-500',
    color: 'text-amber-400',
  },
  {
    id: 'critical',
    label: 'Krytyczny',
    badge: '🔴 Blokada',
    desc: 'Całkowity brak dostępu, awaria systemu lub utrata danych.',
    borderActive: 'border-red-500 bg-red-950/20 ring-1 ring-red-500',
    color: 'text-red-400',
  },
]

function loadBugDraft() {
  try {
    const saved = sessionStorage.getItem(BUG_DRAFT_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.formData) {
        return {
          stepIndex: parsed.stepIndex !== undefined && parsed.stepIndex < 6 ? parsed.stepIndex : 0,
          formData: parsed.formData,
        }
      }
    }
  } catch {
    // Ignoruj błędy
  }
  return null
}

/**
 * ReportBugWizard - Pełnoekranowy kreator zgłaszania błędu w trybie pojedynczego pytania na ekran.
 * Obsługuje wybór aplikacji, tytuł, opis, załącznik graficzny z podglądem, wagę problemu,
 * dane kontaktowe/anonimowość oraz ekran sukcesu z kodem śledzenia i linkiem.
 */
export function ReportBugWizard({ onClose, onReturnToHome }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  // Pobieranie listy publicznych aplikacji
  const [applications, setApplications] = useState([])
  const [loadingApps, setLoadingApps] = useState(true)

  // Stan kreatora z leniwą inicjalizacją ze szkicu
  const initialDraft = useState(() => loadBugDraft())[0]

  const [stepIndex, setStepIndex] = useState(() => initialDraft?.stepIndex || 0) // 0 do 6
  const [direction, setDirection] = useState('next') // 'next' | 'back'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Dane formularza zgłoszenia
  const [formData, setFormData] = useState(() => ({
    appType: 'catalog', // 'catalog' | 'custom'
    applicationId: null,
    selectedAppName: '',
    customUrl: '',
    title: '',
    description: '',
    attachmentUrl: '',
    attachmentPreview: null,
    attachmentFileName: '',
    attachmentFileSize: '',
    severity: 'normal',
    isAnonymous: false,
    guestName: '',
    guestEmail: '',
    ...(initialDraft?.formData || {}),
  }))

  // Wynik po wysłaniu
  const [submittedResult, setSubmittedResult] = useState(null)

  // 1. Ładowanie aplikacji publicznych
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await bugService.getPublicApplications()
        if (active && res?.applications) {
          setApplications(res.applications)
        }
      } catch {
        // Fallback do pustej listy
      } finally {
        if (active) setLoadingApps(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // 2. Zapis szkicu
  const saveDraft = useCallback((nextStepIndex, nextFormData) => {
    try {
      const { attachmentPreview: _preview, ...cleanData } = nextFormData
      sessionStorage.setItem(
        BUG_DRAFT_KEY,
        JSON.stringify({
          stepIndex: nextStepIndex,
          formData: cleanData,
        })
      )
    } catch {
      // Storage error
    }
  }, [])

  const updateFormData = (patch) => {
    setFormData((prev) => {
      const updated = { ...prev, ...patch }
      saveDraft(stepIndex, updated)
      return updated
    })
  }

  // Definicje 7 kroków zgłoszenia błędu
  const stepKeys = [
    'application', // Krok 1: Wybór aplikacji lub inna strona
    'title', // Krok 2: Tytuł problemu
    'description', // Krok 3: Dokładny opis
    'attachment', // Krok 4: Załącznik ze screenshotem
    'severity', // Krok 5: Waga problemu
    'contact', // Krok 6: Dane kontaktowe / Anonimowość
    'success', // Krok 7: Sukces z kodem BUG-XXXX
  ]

  const currentStepKey = stepKeys[stepIndex] || 'application'
  const isFinalStep = currentStepKey === 'success'
  const currentStepNumber = Math.min(stepIndex + 1, 6)
  const totalStepsCount = 6
  const progressPercent = isFinalStep ? 100 : Math.round((currentStepNumber / totalStepsCount) * 100)

  // Przejście dalej
  const goToNextStep = () => {
    setDirection('next')
    setSubmitError(null)
    const nextIdx = stepIndex + 1
    if (nextIdx < stepKeys.length) {
      setStepIndex(nextIdx)
      saveDraft(nextIdx, formData)
    }
  }

  // Powrót
  const goToPrevStep = useCallback(() => {
    setDirection('back')
    setSubmitError(null)
    if (stepIndex > 0) {
      const prevIdx = stepIndex - 1
      setStepIndex(prevIdx)
      saveDraft(prevIdx, formData)
    } else if (onClose) {
      onClose()
    }
  }, [stepIndex, formData, saveDraft, onClose])

  // Obsługa wyboru aplikacji z listy (auto-advance)
  const handleSelectApp = (app) => {
    updateFormData({
      appType: 'catalog',
      applicationId: app.id,
      selectedAppName: app.name,
      customUrl: '',
    })
    setTimeout(() => {
      goToNextStep()
    }, 150)
  }

  // Obsługa wyboru innej strony
  const handleSelectCustomUrl = () => {
    updateFormData({
      appType: 'custom',
      applicationId: null,
      selectedAppName: 'Inna strona / aplikacja',
    })
  }

  // Obsługa wagi problemu (auto-advance)
  const handleSelectSeverity = (sevId) => {
    updateFormData({ severity: sevId })
    setTimeout(() => {
      goToNextStep()
    }, 150)
  }

  // Obsługa pliku załącznika
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    const sizeKb = Math.round(file.size / 1024)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const simulatedUrl = `https://storage.local/attachments/${Date.now()}-${safeName}`

    updateFormData({
      attachmentPreview: previewUrl,
      attachmentFileName: file.name,
      attachmentFileSize: `${sizeKb} KB`,
      attachmentUrl: simulatedUrl,
    })
  }

  const handleRemoveAttachment = () => {
    if (formData.attachmentPreview) {
      URL.revokeObjectURL(formData.attachmentPreview)
    }
    updateFormData({
      attachmentPreview: null,
      attachmentFileName: '',
      attachmentFileSize: '',
      attachmentUrl: '',
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Wysłanie zgłoszenia do API
  const handleSubmitBug = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      severity: formData.severity || 'normal',
      attachment_url: formData.attachmentUrl ? formData.attachmentUrl.trim().slice(0, 999) : null,
      is_anonymous: formData.isAnonymous,
    }

    if (formData.appType === 'catalog' && formData.applicationId) {
      payload.application_id = formData.applicationId
    } else if (formData.customUrl?.trim()) {
      let safeUrl = formData.customUrl.trim()
      if (!/^https?:\/\//i.test(safeUrl)) {
        safeUrl = `https://${safeUrl}`
      }
      payload.custom_url = safeUrl
    }

    if (!user && !formData.isAnonymous) {
      if (formData.guestEmail?.trim()) {
        payload.guest_email = formData.guestEmail.trim()
      }
      if (formData.guestName?.trim()) {
        payload.guest_name = formData.guestName.trim()
      }
    }

    try {
      const res = await bugService.submitBugReport(payload)
      setSubmittedResult(res)
      sessionStorage.removeItem(BUG_DRAFT_KEY)
      setDirection('next')
      setStepIndex(6) // Krok sukcesu
    } catch (err) {
      setSubmitError(err?.message || 'Nie udało się przesłać zgłoszenia. Spróbuj ponownie.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Kopiowanie kodu zgłoszenia
  const handleCopyCode = async () => {
    if (!submittedResult?.tracking_code) return
    try {
      await navigator.clipboard.writeText(submittedResult.tracking_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // clipboard fallback
    }
  }

  // Kopiowanie linku śledzenia
  const handleCopyLink = async () => {
    if (!submittedResult?.tracking_code) return
    try {
      const trackingUrl = `${window.location.origin}/#track=${submittedResult.tracking_code}`
      await navigator.clipboard.writeText(trackingUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // clipboard fallback
    }
  }

  // Zgłoszenie kolejnego błędu
  const handleReportAnother = () => {
    sessionStorage.removeItem(BUG_DRAFT_KEY)
    setFormData({
      appType: 'catalog',
      applicationId: null,
      selectedAppName: '',
      customUrl: '',
      title: '',
      description: '',
      attachmentUrl: '',
      attachmentPreview: null,
      attachmentFileName: '',
      attachmentFileSize: '',
      severity: 'normal',
      isAnonymous: false,
      guestName: '',
      guestEmail: '',
    })
    setSubmittedResult(null)
    setDirection('next')
    setStepIndex(0)
  }

  // Skrót klawiszowy Escape do cofania
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isFinalStep) {
        e.preventDefault()
        goToPrevStep()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFinalStep, goToPrevStep])

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-zinc-950 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] text-zinc-100 select-none">
      {/* Pasek okna macOS */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-red-500/80 border border-red-600/40" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80 border border-yellow-600/40" />
            <span className="h-3 w-3 rounded-full bg-green-500/80 border border-green-600/40" />
          </div>

          {!isFinalStep && (
            <button
              type="button"
              onClick={goToPrevStep}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{stepIndex === 0 ? 'Anuluj' : 'Wstecz'}</span>
              <kbd className="hidden sm:inline rounded bg-zinc-800 px-1 py-0.5 text-[10px] font-mono text-zinc-400 ml-1">
                Esc
              </kbd>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Bug className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="truncate">Zgłaszanie błędu</span>
          </div>

          {!isFinalStep && (
            <span className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
              Krok {currentStepNumber} z {totalStepsCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Zamknij zgłoszenie"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Pasek postępu */}
      {!isFinalStep && (
        <div className="sticky top-[41px] z-30 h-1 w-full bg-zinc-900 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Główny kontener pytań */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        {submitError && (
          <div className="w-full max-w-lg mb-4 rounded-xl border border-red-800/80 bg-red-950/60 p-4 text-xs text-red-200 shadow-lg">
            <div className="font-semibold mb-1">Błąd zapisu zgłoszenia:</div>
            <div>{submitError}</div>
          </div>
        )}

        <div
          key={currentStepKey}
          className={`w-full max-w-2xl select-text ${
            direction === 'next' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          }`}
        >
          {/* ============================================================== */}
          {/* KROK 1: Wybór aplikacji                                        */}
          {/* ============================================================== */}
          {currentStepKey === 'application' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  <span>Krok 1 z 6 • Wybór aplikacji</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                  W której aplikacji wystąpił problem?
                </h2>
                <p className="text-sm text-zinc-400">
                  Wybierz monitorowaną stronę z katalogu lub podaj adres URL innego systemu.
                </p>
              </div>

              {loadingApps ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-3">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                  <span className="text-xs text-zinc-400">Pobieranie listy aplikacji...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {applications.map((app) => {
                      const isSelected =
                        formData.appType === 'catalog' && formData.applicationId === app.id
                      return (
                        <Card
                          key={app.id}
                          tabIndex={0}
                          role="button"
                          onClick={() => handleSelectApp(app)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleSelectApp(app)
                            }
                          }}
                          className={`cursor-pointer border p-4 text-left transition-all duration-150 hover:bg-zinc-900 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500'
                              : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-zinc-100 truncate">
                                {app.name}
                              </div>
                              <div className="text-xs text-zinc-400 font-mono truncate">
                                {app.organization_name}
                              </div>
                              {app.url && (
                                <div className="text-[11px] text-zinc-500 truncate mt-1">
                                  {app.url}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            )}
                          </div>
                        </Card>
                      )
                    })}
                  </div>

                  {/* Karta: Inna strona / aplikacja */}
                  <Card
                    tabIndex={0}
                    role="button"
                    onClick={handleSelectCustomUrl}
                    className={`border p-4 text-left transition-all duration-150 ${
                      formData.appType === 'custom'
                        ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500'
                        : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-emerald-400" />
                          <span className="text-sm font-semibold text-zinc-100">
                            Inna strona / aplikacja
                          </span>
                        </div>
                        {formData.appType === 'custom' && (
                          <Check className="h-4 w-4 text-emerald-400" />
                        )}
                      </div>

                      {formData.appType === 'custom' && (
                        <div className="space-y-2 pt-1 animate-slide-in-right">
                          <Label htmlFor="custom-url" className="text-xs text-zinc-300">
                            Wklej adres URL strony lub nazwę:
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="custom-url"
                              autoFocus
                              type="text"
                              placeholder="https://twoj-serwis.pl/podstrona"
                              value={formData.customUrl}
                              onChange={(e) => updateFormData({ customUrl: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && formData.customUrl.trim()) {
                                  e.preventDefault()
                                  goToNextStep()
                                }
                              }}
                              className="h-10 border-zinc-700 bg-zinc-950 text-sm font-mono focus-visible:ring-emerald-500"
                            />
                            <Button
                              type="button"
                              onClick={goToNextStep}
                              disabled={!formData.customUrl.trim()}
                              className="h-10 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium"
                            >
                              Dalej
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* KROK 2: Tytuł problemu ("Co poszło nie tak?")                  */}
          {/* ============================================================== */}
          {currentStepKey === 'title' && (
            <div className="w-full max-w-lg mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  <span>Krok 2 z 6 • Podsumowanie</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                  Co poszło nie tak?
                </h2>
                <p className="text-sm text-zinc-400">
                  Podaj zwięzły tytuł opisujący problem (np. „Przycisk wysyłki nie reaguje”).
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
                <div className="space-y-2">
                  <Label htmlFor="bug-title" className="text-xs font-medium text-zinc-300">
                    Tytuł zgłoszenia
                  </Label>
                  <Input
                    id="bug-title"
                    autoFocus
                    type="text"
                    placeholder="Krótki, treściwy tytuł problemu..."
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && formData.title.trim().length >= 3) {
                        e.preventDefault()
                        goToNextStep()
                      }
                    }}
                    className="h-12 border-zinc-700 bg-zinc-950 text-base focus-visible:ring-emerald-500"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Min. 3 znaki</span>
                    <span>{formData.title.length} / 200 znaków</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    disabled={formData.title.trim().length < 3}
                    className="w-full h-11 gap-2 font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                  >
                    <span>Dalej do opisu</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <span className="text-[11px] text-zinc-500 font-mono">
                  Naciśnij [Enter ↵] aby zatwierdzić
                </span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* KROK 3: Dokładny opis sytuacji                                */}
          {/* ============================================================== */}
          {currentStepKey === 'description' && (
            <div className="w-full max-w-lg mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  <span>Krok 3 z 6 • Szczegóły</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                  Opisz sytuację
                </h2>
                <p className="text-sm text-zinc-400">
                  Co dokładnie robiłeś, co miało się wydarzyć, a jaki był błąd?
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
                <div className="space-y-2">
                  <Label htmlFor="bug-desc" className="text-xs font-medium text-zinc-300">
                    Dokładny opis
                  </Label>
                  <Textarea
                    id="bug-desc"
                    autoFocus
                    rows={5}
                    placeholder="1. Przeszedłem do zakładki...&#10;2. Kliknąłem przycisk...&#10;3. Oczekiwałem, że formularz zapisze się, a zamiast tego..."
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    className="border-zinc-700 bg-zinc-950 text-sm focus-visible:ring-emerald-500"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Min. 5 znaków</span>
                    <span>{formData.description.length} / 5000</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    disabled={formData.description.trim().length < 5}
                    className="w-full h-11 gap-2 font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                  >
                    <span>Dalej do załącznika</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* KROK 4: Załącznik ze screenshotem                              */}
          {/* ============================================================== */}
          {currentStepKey === 'attachment' && (
            <div className="w-full max-w-lg mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  <span>Krok 4 z 6 • Zrzut ekranu (opcjonalny)</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                  Dołącz zrzut ekranu lub grafikę
                </h2>
                <p className="text-sm text-zinc-400">
                  Jeden obraz mówi więcej niż tysiąc słów i przyspieszy naprawę błędu.
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {formData.attachmentPreview ? (
                  /* Podgląd załącznika */
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
                      <img
                        src={formData.attachmentPreview}
                        alt="Podgląd załącznika"
                        className="max-h-60 w-full object-contain bg-zinc-950"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="absolute top-2 right-2 rounded-full bg-zinc-900/90 p-1.5 text-zinc-300 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        title="Usuń plik"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                      <span className="truncate max-w-[200px]">
                        {formData.attachmentFileName}
                      </span>
                      <span>{formData.attachmentFileSize}</span>
                    </div>
                  </div>
                ) : (
                  /* Pole uploadu */
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-zinc-700 hover:border-emerald-500 bg-zinc-950/40 hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors mb-3">
                      <Upload className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white">
                      Kliknij, aby wybrać grafikę z dysku
                    </span>
                    <span className="text-xs text-zinc-500 mt-1">PNG, JPG, WebP do 10 MB</span>
                  </button>
                )}

                {/* Przyciski akcji */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goToNextStep}
                    className="flex-1 h-11 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  >
                    <span>Pomiń załącznik</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    className="flex-1 h-11 gap-2 font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                  >
                    <span>Dalej do priorytetu</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* KROK 5: Waga problemu (Karty priorytetu)                       */}
          {/* ============================================================== */}
          {currentStepKey === 'severity' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  <span>Krok 5 z 6 • Priorytet</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                  Jak uciążliwy jest ten problem?
                </h2>
                <p className="text-sm text-zinc-400">
                  Wybierz poziom wagi zgłoszenia. Kliknięcie automatycznie przejdzie do kolejnego kroku.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                {SEVERITIES.map((sev) => {
                  const isSelected = formData.severity === sev.id
                  return (
                    <Card
                      key={sev.id}
                      tabIndex={0}
                      role="button"
                      aria-pressed={isSelected}
                      onClick={() => handleSelectSeverity(sev.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSelectSeverity(sev.id)
                        }
                      }}
                      className={`cursor-pointer border p-4 text-left transition-all duration-150 hover:bg-zinc-900 ${
                        isSelected
                          ? sev.borderActive
                          : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className={`text-xs font-semibold ${sev.color}`}>
                            {sev.badge}
                          </span>
                          <div className="text-base font-bold text-zinc-100">{sev.label}</div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{sev.desc}</p>
                        </div>
                        {isSelected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 shrink-0">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* KROK 6: Dane kontaktowe / Anonimowość                          */}
          {/* ============================================================== */}
          {currentStepKey === 'contact' && (
            <div className="w-full max-w-lg mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  <span>Krok 6 z 6 • Identyfikacja</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                  Dane do kontaktu i powiadomień
                </h2>
                <p className="text-sm text-zinc-400">
                  Powiadomimy Cię e-mailem, gdy zgłoszenie zostanie przeanalizowane lub naprawione.
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
                {user ? (
                  /* Zalogowany użytkownik */
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-950/70">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                        {user.first_name?.[0]}
                        {user.last_name?.[0]}
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="font-semibold text-zinc-100 truncate">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-zinc-400 font-mono truncate">{user.email}</div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={formData.isAnonymous}
                        onChange={(e) => updateFormData({ isAnonymous: e.target.checked })}
                        className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Zgłoś jako anonim (ukryj moje nazwisko w raporcie publicznym)</span>
                    </label>
                  </div>
                ) : (
                  /* Niezalogowany Gość */
                  <div className="space-y-3">
                    {!formData.isAnonymous && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="guest-email" className="text-xs text-zinc-300">
                            Twój adres e-mail (do powiadomień o statusie)
                          </Label>
                          <Input
                            id="guest-email"
                            type="email"
                            placeholder="twoj.email@poczta.pl"
                            value={formData.guestEmail}
                            onChange={(e) => updateFormData({ guestEmail: e.target.value })}
                            className="h-10 border-zinc-700 bg-zinc-950 text-sm focus-visible:ring-emerald-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="guest-name" className="text-xs text-zinc-300">
                            Imię / Pseudonim (opcjonalnie)
                          </Label>
                          <Input
                            id="guest-name"
                            type="text"
                            placeholder="np. Tester Marek"
                            value={formData.guestName}
                            onChange={(e) => updateFormData({ guestName: e.target.value })}
                            className="h-10 border-zinc-700 bg-zinc-950 text-sm focus-visible:ring-emerald-500"
                          />
                        </div>
                      </>
                    )}

                    <div className="pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => updateFormData({ isAnonymous: !formData.isAnonymous })}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-colors ${
                          formData.isAnonymous
                            ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300'
                            : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span>Zgłoś całkowicie anonimowo (bez powiadomień)</span>
                        </div>
                        {formData.isAnonymous && <Check className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleSubmitBug}
                    disabled={isSubmitting}
                    className="w-full h-11 gap-2 font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/15"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Przesyłanie zgłoszenia...</span>
                      </>
                    ) : (
                      <>
                        <span>Wyślij zgłoszenie błędu</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* KROK 7: Sukces z kodem BUG-XXXX                                */}
          {/* ============================================================== */}
          {currentStepKey === 'success' && (
            <div className="w-full max-w-lg mx-auto space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  <Check className="w-3.5 h-3.5" />
                  <span>Zgłoszenie zarejestrowane</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                  Dziękujemy za zgłoszenie!
                </h2>
                <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Twój raport trafił do kolejki analizy zespołu deweloperskiego. Możesz śledzić postępy za pomocą unikalnego kodu.
                </p>
              </div>

              {/* Karta kodu śledzenia */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-5 text-left space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <span className="text-xs text-zinc-400">Unikalny kod zgłoszenia:</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 font-mono text-base font-bold text-emerald-300">
                      {submittedResult?.tracking_code || 'BUG-1000'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                      title="Skopiuj kod"
                    >
                      {copiedCode ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 space-y-1">
                  <div className="font-semibold text-zinc-200 truncate">
                    Tytuł: {formData.title}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span>Aplikacja: {formData.selectedAppName || 'Zgłoszenie ogólne'}</span>
                    <span>•</span>
                    <span className="capitalize">Priorytet: {formData.severity}</span>
                  </div>
                </div>

                {/* Przycisk kopiowania linku */}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCopyLink}
                  className="w-full gap-2 text-xs h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>
                    {copiedLink ? 'Skopiowano link do schowka!' : 'Skopiuj bezpośredni link śledzenia'}
                  </span>
                </Button>
              </div>

              {/* Przyciski nawigacji */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReportAnother}
                  className="flex-1 h-11 gap-2 border-zinc-700 hover:bg-zinc-800 text-zinc-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Zgłoś kolejny błąd</span>
                </Button>

                <Button
                  type="button"
                  onClick={onReturnToHome || onClose}
                  className="flex-1 h-11 gap-2 font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-950"
                >
                  <span>{user ? 'Wróć do pulpitu' : 'Strona główna'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-3 px-4 border-t border-zinc-900 bg-zinc-950/60 text-center text-xs text-zinc-600">
        <span>TaskFlow Public Bug Tracker • Weryfikowane przez automatyczny audyt</span>
      </footer>
    </div>
  )
}
