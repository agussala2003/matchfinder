import { SoccerLoader } from '@/components/ui/SoccerLoader'
import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react'

interface LoaderOptions {
  key?: string
  message?: string
  blocking?: boolean
}

interface LoaderEntry {
  message?: string
  blocking: boolean
}

interface GlobalLoadingContextType {
  isLoading: boolean
  showLoading: (options?: LoaderOptions) => string
  hideLoading: (key?: string) => void
  withGlobalLoading: <T>(task: Promise<T>, options?: LoaderOptions) => Promise<T>
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined)

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, LoaderEntry>>({})

  const showLoading = (options: LoaderOptions = {}) => {
    const key = options.key || `loader-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setEntries((prev) => ({
      ...prev,
      [key]: {
        message: options.message,
        blocking: options.blocking ?? true,
      },
    }))
    return key
  }

  const hideLoading = (key?: string) => {
    if (!key) {
      setEntries({})
      return
    }

    setEntries((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const withGlobalLoading = async <T,>(task: Promise<T>, options: LoaderOptions = {}): Promise<T> => {
    const key = showLoading(options)
    try {
      return await task
    } finally {
      hideLoading(key)
    }
  }

  const activeEntries = useMemo(() => Object.values(entries), [entries])
  const isLoading = activeEntries.length > 0
  const blocking = activeEntries.some((entry) => entry.blocking)
  const latestMessage = [...activeEntries].reverse().find((entry) => entry.message)?.message

  return (
    <GlobalLoadingContext.Provider
      value={{
        isLoading,
        showLoading,
        hideLoading,
        withGlobalLoading,
      }}
    >
      {children}
      <SoccerLoader visible={isLoading} blocking={blocking} message={latestMessage} />
    </GlobalLoadingContext.Provider>
  )
}

export function useGlobalLoading() {
  const context = useContext(GlobalLoadingContext)
  if (!context) throw new Error('useGlobalLoading debe usarse dentro de GlobalLoadingProvider')
  return context
}
