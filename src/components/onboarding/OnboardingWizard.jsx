import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Building2,
  Layers,
  Lock,
  Mail,
  RotateCcw,
  User,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { onboardingService } from '../../services/onboardingService'
import { AccountTypeStep } from './AccountTypeStep'
import { BusinessForkStep } from './BusinessForkStep'
import { IndustrySizeStep } from './IndustrySizeStep'
import { JoinCodeStep } from './JoinCodeStep'
import { JoinPendingStep } from './JoinPendingStep'
import { OnboardingSuccessStep } from './OnboardingSuccessStep'
import { OneInputStep } from './OneInputStep'
import { SlugStep } from './SlugStep'
import { TeammateInvitesStep } from './TeammateInvitesStep'
import { WelcomeStep } from './WelcomeStep'

const DRAFT_STORAGE_KEY = 'taskflow_onboarding_draft'

const DEMO_LOGIN_ACCOUNTS = [
  { email: 'admin@firma.pl', label: '👑 Administrator', name: 'Jan Zieliński' },
  { email: 'anna.kowalska@firma.pl', label: '💼 Dyrektor', name: 'Anna Kowalska' },
  { email: 'marek.wisniewski@firma.pl', label: '📋 Kierownik', name: 'Marek Wiśniewski' },
  { email: 'piotr.nowak@firma.pl', label: '💻 Pracownik', name: 'Piotr Nowak' },
]

const DEMO_PASSWORD = 'TaskFlow2026!'

function loadInitialDraft() {
  try {
    const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.flow && parsed.flow !== 'welcome') {
        return {
          flow: parsed.flow,
          stepIndex: parsed.stepIndex || 0,
          formData: parsed.formData || null,
        }
      }
    }
  } catch {
    // Ignoruj błędy
  }
  return null
}

/**
 * OnboardingWizard - Pełnoekranowy kreator pojedynczych pytań (one-thing-per-screen)
 * w ciemnej estetyce zinc macOS z dot-grid canvas, animowanym paskiem postępu,
 * auto-advance dla kart wyboru, skrótami klawiszowymi i persystencją w sessionStorage.
 */
export function OnboardingWizard({ onOpenGuestBug, onSwitchToClassicLogin }) {
  const { login, refreshMe } = useAuth()

  // Stan formularza i etapów (z leniwą inicjalizacją ze szkicu)
  const initialDraft = useState(() => loadInitialDraft())[0]

  const [flow, setFlow] = useState(() => initialDraft?.flow || 'welcome')
  const [stepIndex, setStepIndex] = useState(() => initialDraft?.stepIndex || 0)
  const [direction, setDirection] = useState('next') // 'next' | 'back'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState(null)

  // Dane zebrane podczas wdrożenia
  const [formData, setFormData] = useState(() => ({
    accountType: 'individual',
    businessFork: 'create',
    joinCode: '',
    verifiedOrg: null,
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    orgName: '',
    orgSlug: '',
    industry: 'it_software',
    size: '11-50',
    appName: '',
    appUrl: '',
    invites: [],
    ...(initialDraft?.formData || {}),
  }))

  // Wyniki końcowe
  const [createdUser, setCreatedUser] = useState(null)
  const [createdOrg, setCreatedOrg] = useState(null)

  // Persystencja szkicu w sessionStorage przy zmianach
  const saveDraft = useCallback((nextFlow, nextStepIndex, nextFormData) => {
    try {
      if (nextFlow === 'welcome') {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY)
      } else {
        sessionStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            flow: nextFlow,
            stepIndex: nextStepIndex,
            formData: nextFormData,
          })
        )
      }
    } catch {
      // Storage quota
    }
  }, [])

  const updateFormData = (patch) => {
    setFormData((prev) => {
      const updated = { ...prev, ...patch }
      saveDraft(flow, stepIndex, updated)
      return updated
    })
  }

  // 3. Definicje kroków w zależności od wybranego flow
  // Zwraca tablicę identyfikatorów kroków
  const getStepList = () => {
    switch (flow) {
      case 'login':
        return ['login_email', 'login_password']
      case 'individual':
        return [
          'account_type',
          'ind_name',
          'ind_email',
          'ind_password',
          'ind_success',
        ]
      case 'business_join':
        return [
          'account_type',
          'business_fork',
          'join_code',
          'join_name',
          'join_email',
          'join_password',
          'join_pending',
        ]
      case 'business_create':
        return [
          'account_type',
          'business_fork',
          'admin_name',
          'admin_email',
          'admin_password',
          'org_name',
          'org_slug',
          'industry_size',
          'first_app',
          'invites',
          'create_success',
        ]
      default:
        return ['welcome']
    }
  }

  const stepList = getStepList()
  const currentStepKey = stepList[stepIndex] || 'welcome'
  const isFinalStep =
    currentStepKey === 'ind_success' ||
    currentStepKey === 'create_success' ||
    currentStepKey === 'join_pending'

  // Liczba kroków do wskaźnika postępu (z pominięciem ekranu sukcesu)
  const totalDisplaySteps = stepList.filter(
    (k) => !['welcome', 'ind_success', 'create_success', 'join_pending'].includes(k)
  ).length

  const currentDisplayStep = Math.min(stepIndex + 1, totalDisplaySteps || 1)
  const progressPercent = isFinalStep
    ? 100
    : flow === 'welcome'
    ? 0
    : Math.round(((stepIndex + 1) / (stepList.length)) * 100)

  // Przejście do następnego kroku
  const goToNextStep = () => {
    setDirection('next')
    setApiError(null)
    const nextIdx = stepIndex + 1
    if (nextIdx < stepList.length) {
      setStepIndex(nextIdx)
      saveDraft(flow, nextIdx, formData)
    }
  }

  // Przejście do poprzedniego kroku
  const goToPrevStep = useCallback(() => {
    setDirection('back')
    setApiError(null)
    if (stepIndex > 0) {
      const prevIdx = stepIndex - 1
      setStepIndex(prevIdx)
      saveDraft(flow, prevIdx, formData)
    } else {
      // Powrót do ekranu powitalnego
      setFlow('welcome')
      setStepIndex(0)
      saveDraft('welcome', 0, formData)
    }
  }, [stepIndex, flow, formData, saveDraft])

  // Reset całego kreatora
  const handleResetDraft = () => {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY)
    setFlow('welcome')
    setStepIndex(0)
    setFormData({
      accountType: 'individual',
      businessFork: 'create',
      joinCode: '',
      verifiedOrg: null,
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      orgName: '',
      orgSlug: '',
      industry: 'it_software',
      size: '11-50',
      appName: '',
      appUrl: '',
      invites: [],
    })
    setApiError(null)
  }

  // Obsługa wyboru na ekranie Welcome
  const handleWelcomeChoice = (choice) => {
    setDirection('next')
    setApiError(null)
    if (choice === 'guest_bug') {
      if (onOpenGuestBug) onOpenGuestBug()
      return
    }
    if (choice === 'login') {
      setFlow('login')
      setStepIndex(0)
      saveDraft('login', 0, formData)
      return
    }
    if (choice === 'register') {
      setFlow('individual') // default starting flow
      setStepIndex(0)
      saveDraft('individual', 0, formData)
    }
  }

  // Obsługa wyboru typu konta w AccountTypeStep (auto-advance)
  const handleAccountTypeSelect = (type) => {
    updateFormData({ accountType: type })
    if (type === 'individual') {
      setFlow('individual')
      setStepIndex(1) // przejdź do 'ind_name'
      saveDraft('individual', 1, { ...formData, accountType: 'individual' })
    } else {
      setFlow('business_create') // domyślnie biznesowy
      setStepIndex(1) // przejdź do 'business_fork'
      saveDraft('business_create', 1, { ...formData, accountType: 'business' })
    }
  }

  // Obsługa wyboru forka biznesowego (auto-advance)
  const handleBusinessForkSelect = (fork) => {
    updateFormData({ businessFork: fork })
    if (fork === 'join') {
      setFlow('business_join')
      setStepIndex(2) // 'join_code'
      saveDraft('business_join', 2, { ...formData, businessFork: 'join' })
    } else {
      setFlow('business_create')
      setStepIndex(2) // 'admin_name'
      saveDraft('business_create', 2, { ...formData, businessFork: 'create' })
    }
  }

  // Finalizacja: Rejestracja indywidualna
  const handleCompleteIndividual = async () => {
    setIsSubmitting(true)
    setApiError(null)
    try {
      const res = await onboardingService.registerIndividual({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
      })
      setCreatedUser(res.user)
      sessionStorage.removeItem(DRAFT_STORAGE_KEY)
      goToNextStep() // przejdź do 'ind_success'
    } catch (err) {
      setApiError(err?.message || 'Nie udało się zarejestrować konta. Spróbuj ponownie.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Finalizacja: Dołączenie do firmy z kodem
  const handleCompleteJoin = async () => {
    setIsSubmitting(true)
    setApiError(null)
    try {
      await onboardingService.joinWithCode({
        code: formData.joinCode,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
      })
      sessionStorage.removeItem(DRAFT_STORAGE_KEY)
      goToNextStep() // przejdź do 'join_pending'
    } catch (err) {
      setApiError(err?.message || 'Nie udało się przesłać wniosku o dołączenie.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Finalizacja: Stworzenie nowej firmy
  const handleCompleteCreateOrg = async () => {
    setIsSubmitting(true)
    setApiError(null)
    try {
      const res = await onboardingService.createOrganization({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        org_name: formData.orgName,
        org_slug: formData.orgSlug || undefined,
        industry: formData.industry,
        size: formData.size,
      })
      setCreatedUser(res.user)
      setCreatedOrg(res.organization)
      sessionStorage.removeItem(DRAFT_STORAGE_KEY)
      goToNextStep() // przejdź do 'create_success'
    } catch (err) {
      setApiError(err?.message || 'Nie udało się stworzyć organizacji.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obsługa logowania krok-po-kroku
  const handleLoginSubmit = async () => {
    setIsSubmitting(true)
    setApiError(null)
    try {
      await login(formData.email.trim(), formData.password)
      sessionStorage.removeItem(DRAFT_STORAGE_KEY)
      // Login w useAuth zaktualizuje stan usera i AppShell przełączy na workspace
    } catch (err) {
      setApiError(err?.message || 'Nieprawidłowy login lub hasło.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Globalny skrót klawiszowy Escape do powrotu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (flow !== 'welcome' && !isFinalStep) {
          e.preventDefault()
          goToPrevStep()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flow, isFinalStep, goToPrevStep])

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-zinc-950 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] text-zinc-100 select-none">
      {/* Pasek okna w stylu macOS */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-2.5 backdrop-blur-md">
        {/* Lewa strona: macOS traffic lights + powrót */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-red-500/80 border border-red-600/40" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80 border border-yellow-600/40" />
            <span className="h-3 w-3 rounded-full bg-green-500/80 border border-green-600/40" />
          </div>

          {flow !== 'welcome' && !isFinalStep && (
            <button
              type="button"
              onClick={goToPrevStep}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Wstecz</span>
              <kbd className="hidden sm:inline rounded bg-zinc-800 px-1 py-0.5 text-[10px] font-mono text-zinc-400 ml-1">
                Esc
              </kbd>
            </button>
          )}
        </div>

        {/* Środek: Nazwa aplikacji i ewentualny label kroku */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Layers className="h-4 w-4 text-sky-400 shrink-0" />
            <span className="truncate">TaskFlow</span>
          </div>

          {flow !== 'welcome' && !isFinalStep && totalDisplaySteps > 0 && (
            <span className="hidden sm:inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
              Krok {currentDisplayStep} z {totalDisplaySteps}
            </span>
          )}
        </div>

        {/* Prawa strona: Narzędzia resetu i logowania klasycznego */}
        <div className="flex items-center gap-2">
          {flow !== 'welcome' && (
            <button
              type="button"
              onClick={handleResetDraft}
              title="Zacznij kreator od nowa"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden md:inline">Od nowa</span>
            </button>
          )}

          {onSwitchToClassicLogin && (
            <button
              type="button"
              onClick={onSwitchToClassicLogin}
              className="rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            >
              Logowanie klasyczne
            </button>
          )}
        </div>
      </header>

      {/* Animowany pasek postępu wizualnego */}
      {flow !== 'welcome' && (
        <div className="sticky top-[41px] z-30 h-1 w-full bg-zinc-900 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Główny kontener zawartości pytań */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        {/* Banner błędu API jeśli wystąpił */}
        {apiError && (
          <div className="w-full max-w-lg mb-4 rounded-xl border border-red-800/80 bg-red-950/60 p-4 text-xs text-red-200 shadow-lg">
            <div className="font-semibold mb-1">Wystąpił problem:</div>
            <div>{apiError}</div>
          </div>
        )}

        <div
          key={`${flow}-${stepIndex}`}
          className={`w-full max-w-2xl select-text ${
            direction === 'next' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          }`}
        >
          {/* ======================= FLOW: WELCOME ======================= */}
          {currentStepKey === 'welcome' && (
            <WelcomeStep onSelectChoice={handleWelcomeChoice} />
          )}

          {/* ======================= FLOW: LOGIN ======================= */}
          {currentStepKey === 'login_email' && (
            <OneInputStep
              badge="Logowanie do TaskFlow"
              badgeIcon={Mail}
              title="Podaj swój adres e-mail"
              subtitle="Wprowadź adres służbowy powiązany z Twoim kontem w systemie."
              type="email"
              placeholder="np. jan.zielinski@firma.pl"
              value={formData.email}
              onChange={(val) => updateFormData({ email: val })}
              onNext={goToNextStep}
              demoAccounts={DEMO_LOGIN_ACCOUNTS}
              onSelectDemoAccount={(acc) => {
                updateFormData({ email: acc.email, password: DEMO_PASSWORD })
              }}
              submitLabel="Dalej do hasła"
            />
          )}

          {currentStepKey === 'login_password' && (
            <OneInputStep
              badge="Bezpieczne logowanie"
              badgeIcon={Lock}
              title="Wprowadź hasło"
              subtitle={`Logujesz się jako ${formData.email}`}
              type="password"
              placeholder="Hasło do konta"
              value={formData.password}
              onChange={(val) => updateFormData({ password: val })}
              onNext={handleLoginSubmit}
              isSubmitting={isSubmitting}
              submitLabel={isSubmitting ? 'Logowanie...' : 'Zaloguj się'}
            />
          )}

          {/* ======================= REJESTRACJA KROK 1: ACCOUNT TYPE ======================= */}
          {currentStepKey === 'account_type' && (
            <AccountTypeStep
              selectedType={formData.accountType}
              onSelectType={handleAccountTypeSelect}
            />
          )}

          {/* ======================= REJESTRACJA KROK 2: BUSINESS FORK ======================= */}
          {currentStepKey === 'business_fork' && (
            <BusinessForkStep
              selectedFork={formData.businessFork}
              onSelectFork={handleBusinessForkSelect}
            />
          )}

          {/* ======================= FLOW: INDIVIDUAL ======================= */}
          {currentStepKey === 'ind_name' && (
            <OneInputStep
              badge="Konto indywidualne • Krok 1 z 3"
              badgeIcon={User}
              title="Jak się nazywasz?"
              subtitle="Twoje imię i nazwisko będą widoczne przy zgłaszanych problemach."
              type="name_pair"
              value={formData.firstName}
              secondaryValue={formData.lastName}
              onChange={(val) => updateFormData({ firstName: val })}
              onSecondaryChange={(val) => updateFormData({ lastName: val })}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'ind_email' && (
            <OneInputStep
              badge="Konto indywidualne • Krok 2 z 3"
              badgeIcon={Mail}
              title="Jaki jest Twój adres e-mail?"
              subtitle="Na ten adres będziemy przesyłać powiadomienia o postępach w naprawie błędów."
              type="email"
              placeholder="twoj.email@poczta.pl"
              value={formData.email}
              onChange={(val) => updateFormData({ email: val })}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'ind_password' && (
            <OneInputStep
              badge="Konto indywidualne • Krok 3 z 3"
              badgeIcon={Lock}
              title="Ustaw bezpieczne hasło"
              subtitle="Hasło powinno składać się z co najmniej 8 znaków."
              type="password"
              placeholder="Wprowadź silne hasło"
              value={formData.password}
              onChange={(val) => updateFormData({ password: val })}
              onNext={handleCompleteIndividual}
              isSubmitting={isSubmitting}
              submitLabel={isSubmitting ? 'Rejestrowanie konta...' : 'Zarejestruj konto'}
            />
          )}

          {currentStepKey === 'ind_success' && (
            <OnboardingSuccessStep
              user={createdUser}
              onFinish={() => {
                void refreshMe()
              }}
            />
          )}

          {/* ======================= FLOW: BUSINESS JOIN ======================= */}
          {currentStepKey === 'join_code' && (
            <JoinCodeStep
              code={formData.joinCode}
              onCodeChange={(val) => updateFormData({ joinCode: val })}
              onValidVerified={(res) => updateFormData({ verifiedOrg: res.organization })}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'join_name' && (
            <OneInputStep
              badge="Dołączanie do zespołu"
              badgeIcon={User}
              title="Jak się nazywasz?"
              subtitle={
                formData.verifiedOrg
                  ? `Dołączasz do firmy: ${formData.verifiedOrg.name}`
                  : 'Twoje dane personalne w systemie'
              }
              type="name_pair"
              value={formData.firstName}
              secondaryValue={formData.lastName}
              onChange={(val) => updateFormData({ firstName: val })}
              onSecondaryChange={(val) => updateFormData({ lastName: val })}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'join_email' && (
            <OneInputStep
              badge="Dołączanie do zespołu"
              badgeIcon={Mail}
              title="Podaj swój e-mail służbowy"
              subtitle="Adres e-mail, którym będziesz logować się do przestrzeni firmowej."
              type="email"
              placeholder="imie.nazwisko@twoja-firma.pl"
              value={formData.email}
              onChange={(val) => updateFormData({ email: val })}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'join_password' && (
            <OneInputStep
              badge="Dołączanie do zespołu"
              badgeIcon={Lock}
              title="Ustaw hasło do konta"
              subtitle="Będziesz go używać po zatwierdzeniu Twojego konta przez administratora."
              type="password"
              placeholder="Hasło (min. 8 znaków)"
              value={formData.password}
              onChange={(val) => updateFormData({ password: val })}
              onNext={handleCompleteJoin}
              isSubmitting={isSubmitting}
              submitLabel={isSubmitting ? 'Wysyłanie wniosku...' : 'Wyślij wniosek o dołączenie'}
            />
          )}

          {currentStepKey === 'join_pending' && (
            <JoinPendingStep
              orgName={formData.verifiedOrg?.name}
              onGoHome={() => {
                setFlow('welcome')
                setStepIndex(0)
              }}
            />
          )}

          {/* ======================= FLOW: BUSINESS CREATE ======================= */}
          {currentStepKey === 'admin_name' && (
            <OneInputStep
              badge="Administrator organizacji • Krok 1"
              badgeIcon={User}
              title="Jak się nazywasz?"
              subtitle="Będziesz Głównym Administratorem zakładanej organizacji."
              type="name_pair"
              value={formData.firstName}
              secondaryValue={formData.lastName}
              onChange={(val) => updateFormData({ firstName: val })}
              onSecondaryChange={(val) => updateFormData({ lastName: val })}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'admin_email' && (
            <OneInputStep
              badge="Administrator organizacji • Krok 2"
              badgeIcon={Mail}
              title="Jaki jest Twój e-mail służbowy?"
              subtitle="Będzie to Twój główny login administracyjny."
              type="email"
              placeholder="admin@twoja-firma.pl"
              value={formData.email}
              onChange={(val) => updateFormData({ email: val })}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'admin_password' && (
            <OneInputStep
              badge="Administrator organizacji • Krok 3"
              badgeIcon={Lock}
              title="Ustaw hasło administratora"
              subtitle="Zadbaj o silne hasło zabezpieczające dostęp do panelu firmy."
              type="password"
              placeholder="Hasło administratora"
              value={formData.password}
              onChange={(val) => updateFormData({ password: val })}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'org_name' && (
            <OneInputStep
              badge="Konfiguracja firmy • Krok 4"
              badgeIcon={Building2}
              title="Jak nazywa się Twoja firma lub zespół?"
              subtitle="Nazwa będzie wyświetlana na nagłówkach projektów i zaproszeniach."
              type="text"
              placeholder="np. Acme Corporation"
              value={formData.orgName}
              onChange={(val) => {
                const autoSlug = val
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, '')
                updateFormData({ orgName: val, orgSlug: autoSlug })
              }}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'org_slug' && (
            <SlugStep
              slug={formData.orgSlug}
              orgName={formData.orgName}
              onSlugChange={(val) => updateFormData({ orgSlug: val })}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'industry_size' && (
            <IndustrySizeStep
              industry={formData.industry}
              size={formData.size}
              onChange={(data) => updateFormData(data)}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'first_app' && (
            <OneInputStep
              badge="Monitoring aplikacji • Krok 7"
              badgeIcon={Layers}
              title="Pierwsza monitorowana aplikacja lub strona"
              subtitle="Do tej aplikacji użytkownicy i testerzy będą mogli zgłaszać usterki."
              type="text"
              placeholder="np. Sklep internetowy / Portal klienta"
              value={formData.appName}
              secondaryLabel="Adres URL aplikacji (opcjonalnie)"
              secondaryPlaceholder="https://portal.twoja-firma.pl"
              secondaryValue={formData.appUrl}
              onChange={(val) => updateFormData({ appName: val })}
              onSecondaryChange={(val) => updateFormData({ appUrl: val })}
              onNext={goToNextStep}
            />
          )}

          {currentStepKey === 'invites' && (
            <TeammateInvitesStep
              invites={formData.invites}
              onInvitesChange={(invites) => updateFormData({ invites })}
              onNext={handleCompleteCreateOrg}
              onSkip={handleCompleteCreateOrg}
            />
          )}

          {currentStepKey === 'create_success' && (
            <OnboardingSuccessStep
              user={createdUser}
              organization={createdOrg}
              onFinish={() => {
                void refreshMe()
              }}
            />
          )}
        </div>
      </main>

      {/* Dyskretna stopka */}
      <footer className="py-3 px-4 border-t border-zinc-900 bg-zinc-950/60 text-center text-xs text-zinc-600">
        <span>TaskFlow Engine • Wdrożenie krok-po-kroku • Wszystkie dane szyfrowane</span>
      </footer>
    </div>
  )
}
