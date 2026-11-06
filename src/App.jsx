import { AppProvider } from './context/AppContext'
import { MainLayout } from './components/MainLayout'

/**
 * App.jsx - korzeń całej aplikacji.
 * 
 * Tutaj owijamy wszystko w <AppProvider>, dzięki czemu
 * każdy komponent wewnątrz ma dostęp do globalnego stanu
 * przez hook useAppContext().
 * 
 * Struktura drzewa komponentów:
 * App
 * └── AppProvider (Context - globalny stan)
 *     └── MainLayout (layout okna macOS)
 *         ├── TopBar (górny pasek z profilem i przełącznikiem usera)
 *         ├── LeftSheet (wysuwany panel "Do zrobienia")
 *         ├── RightSheet (wysuwany panel "Zrobione" i "Kosz")
 *         └── MainArea (środek - zadania "W trakcie")
 */
function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  )
}

export default App
