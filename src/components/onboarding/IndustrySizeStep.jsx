import { useState } from 'react'
import { ArrowRight, Briefcase, Building, Check, Users } from 'lucide-react'
import { Button } from '../ui/button'

const INDUSTRIES = [
  { id: 'it_software', label: 'Software & IT', icon: '💻' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛍️' },
  { id: 'fintech', label: 'Finanse & Fintech', icon: '💳' },
  { id: 'agency', label: 'Agencja & Marketing', icon: '🎨' },
  { id: 'services', label: 'Usługi B2B', icon: '🤝' },
  { id: 'other', label: 'Inna branża', icon: '🏢' },
]

const SIZES = [
  { id: '1-10', label: '1 - 10 osób', desc: 'Startup / Mały zespół' },
  { id: '11-50', label: '11 - 50 osób', desc: 'Rosnąca firma' },
  { id: '51-200', label: '51 - 200 osób', desc: 'Średnie przedsiębiorstwo' },
  { id: '200+', label: '200+ osób', desc: 'Duża organizacja / Korporacja' },
]

/**
 * IndustrySizeStep - Wybór branży oraz wielkości organizacji.
 */
export function IndustrySizeStep({ industry, size, onChange, onNext }) {
  const [selectedIndustry, setSelectedIndustry] = useState(industry || 'it_software')
  const [selectedSize, setSelectedSize] = useState(size || '11-50')

  const handleSelectIndustry = (val) => {
    setSelectedIndustry(val)
    onChange({ industry: val, size: selectedSize })
  }

  const handleSelectSize = (val) => {
    setSelectedSize(val)
    onChange({ industry: selectedIndustry, size: val })
  }

  const handleContinue = () => {
    onChange({ industry: selectedIndustry, size: selectedSize })
    onNext()
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-400 text-xs font-mono">
          <Building className="w-3.5 h-3.5" />
          <span>Profil firmy</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Branża i wielkość Twojej organizacji
        </h2>
        <p className="text-sm text-zinc-400">
          Pozwoli nam to dostosować domyślne szablony procesów i priorytety zadań.
        </p>
      </div>

      <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
        {/* Wybór branży */}
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-sky-400" />
            <span>Główna branża</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INDUSTRIES.map((ind) => {
              const active = selectedIndustry === ind.id
              return (
                <button
                  type="button"
                  key={ind.id}
                  onClick={() => handleSelectIndustry(ind.id)}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${
                    active
                      ? 'border-sky-500 bg-sky-950/30 text-sky-300 ring-1 ring-sky-500 shadow-sm'
                      : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="text-base select-none">{ind.icon}</span>
                  <span className="truncate">{ind.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Wybór wielkości zespołu */}
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span>Wielkość firmy</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SIZES.map((sz) => {
              const active = selectedSize === sz.id
              return (
                <button
                  type="button"
                  key={sz.id}
                  onClick={() => handleSelectSize(sz.id)}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                    active
                      ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200 ring-1 ring-indigo-500 shadow-sm'
                      : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-zinc-100">{sz.label}</div>
                    <div className="text-[11px] text-zinc-400">{sz.desc}</div>
                  </div>
                  {active && <Check className="h-4 w-4 text-indigo-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            onClick={handleContinue}
            className="w-full h-11 gap-2 font-medium bg-sky-500 hover:bg-sky-400 text-zinc-950"
          >
            <span>Dalej</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
