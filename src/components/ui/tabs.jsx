import * as React from 'react'
import { cn } from '../../lib/utils'

const TabsContext = React.createContext(undefined)

function useTabsContext() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) {
    throw new Error('Komponenty TabsTrigger/TabsContent muszą być używane wewnątrz <Tabs>')
  }
  return ctx
}

function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  className,
  children,
  ...props
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? '')
  const baseId = React.useId()
  const isControlled = controlledValue !== undefined
  const activeValue = isControlled ? controlledValue : uncontrolledValue

  const setActiveValue = React.useCallback(
    (nextValue) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue)
      }
      onValueChange?.(nextValue)
    },
    [isControlled, onValueChange]
  )

  const contextValue = React.useMemo(
    () => ({
      activeValue,
      setActiveValue,
      orientation,
      baseId,
    }),
    [activeValue, setActiveValue, orientation, baseId]
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        data-orientation={orientation}
        className={cn('w-full', className)}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef(({ className, ...props }, ref) => {
  const { orientation } = useTabsContext()

  const handleKeyDown = (e) => {
    const list = e.currentTarget
    const triggers = Array.from(
      list.querySelectorAll('[role="tab"]:not([disabled])')
    )
    if (triggers.length === 0) return

    const currentIndex = triggers.indexOf(document.activeElement)
    if (currentIndex === -1) return

    const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'

    let nextIndex = -1
    if (e.key === nextKey) {
      nextIndex = (currentIndex + 1) % triggers.length
    } else if (e.key === prevKey) {
      nextIndex = (currentIndex - 1 + triggers.length) % triggers.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = triggers.length - 1
    }

    if (nextIndex !== -1) {
      e.preventDefault()
      triggers[nextIndex].focus()
      triggers[nextIndex].click()
    }
  }

  return (
    <div
      ref={ref}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-zinc-400',
        orientation === 'vertical' && 'h-auto flex-col items-stretch',
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = 'TabsList'

const TabsTrigger = React.forwardRef(
  ({ className, value, disabled = false, onClick, ...props }, ref) => {
    const { activeValue, setActiveValue, baseId } = useTabsContext()
    const isSelected = activeValue === value

    const handleClick = (e) => {
      if (!disabled) {
        setActiveValue(value)
      }
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={`${baseId}-tab-${value}`}
        aria-selected={isSelected}
        aria-controls={`${baseId}-panel-${value}`}
        data-state={isSelected ? 'active' : 'inactive'}
        tabIndex={isSelected ? 0 : -1}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500',
          'disabled:pointer-events-none disabled:opacity-50',
          'hover:text-zinc-200',
          'data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm',
          className
        )}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = 'TabsTrigger'

const TabsContent = React.forwardRef(
  ({ className, value, forceMount = false, children, ...props }, ref) => {
    const { activeValue, baseId } = useTabsContext()
    const isSelected = activeValue === value

    if (!isSelected && !forceMount) {
      return null
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`${baseId}-panel-${value}`}
        aria-labelledby={`${baseId}-tab-${value}`}
        data-state={isSelected ? 'active' : 'inactive'}
        hidden={!isSelected}
        tabIndex={0}
        className={cn(
          'mt-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 rounded-md',
          !isSelected && 'hidden',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsContent, TabsList, TabsTrigger }
