import { Toaster } from './components/ui/toaster'
import { TooltipProvider } from './components/ui/tooltip'
import { AppShell } from './components/AppShell'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

/**
 * App.jsx - korzeń całej aplikacji.
 *
 * Hierarchia providerów:
 * ToastProvider -> AuthProvider -> AppProvider -> TooltipProvider -> AppShell + Toaster
 */
function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppProvider>
          <TooltipProvider delayDuration={250}>
            <AppShell />
            <Toaster />
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
