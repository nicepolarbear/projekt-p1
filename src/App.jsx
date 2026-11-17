import { Toaster } from './components/ui/toaster'
import { TooltipProvider } from './components/ui/tooltip'
import { AppShell } from './components/AppShell'
import { AppProvider, useAppContext } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { LiveEventsProvider } from './context/LiveEventsContext'
import { ToastProvider } from './context/ToastContext'

function LiveEventsBridge({ children }) {
  const { refreshTasks, focusTask } = useAppContext()
  return (
    <LiveEventsProvider
      onTaskUpdated={() => refreshTasks({ silent: true })}
      onOpenTask={(taskId) => focusTask?.(taskId)}
    >
      {children}
    </LiveEventsProvider>
  )
}

/**
 * App.jsx - korzeń całej aplikacji.
 *
 * Hierarchia providerów:
 * ToastProvider -> AuthProvider -> AppProvider -> LiveEventsBridge -> TooltipProvider -> AppShell + Toaster
 */
function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppProvider>
          <LiveEventsBridge>
            <TooltipProvider delayDuration={250}>
              <AppShell />
              <Toaster />
            </TooltipProvider>
          </LiveEventsBridge>
        </AppProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
