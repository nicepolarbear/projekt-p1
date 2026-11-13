import { useCallback, useEffect, useState } from 'react'

const STORAGE_PREFIX = 'taskflow:desktop:'
const INITIAL_Z_INDEX = 20

function getStorageKey(userId) {
  return userId ? `${STORAGE_PREFIX}${userId}` : null
}

function readPersistedLayout(storageKey) {
  if (!storageKey || typeof window === 'undefined') {
    return { windowPositions: {}, windowZIndices: {}, topZ: INITIAL_Z_INDEX }
  }
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return { windowPositions: {}, windowZIndices: {}, topZ: INITIAL_Z_INDEX }
    }
    const parsed = JSON.parse(raw)
    const windowPositions =
      parsed?.windowPositions && typeof parsed.windowPositions === 'object'
        ? parsed.windowPositions
        : {}
    const windowZIndices =
      parsed?.windowZIndices && typeof parsed.windowZIndices === 'object'
        ? parsed.windowZIndices
        : {}
    const zValues = Object.values(windowZIndices).filter((v) => typeof v === 'number')
    const topZ = zValues.length > 0 ? Math.max(INITIAL_Z_INDEX, ...zValues) : INITIAL_Z_INDEX
    return { windowPositions, windowZIndices, topZ }
  } catch {
    return { windowPositions: {}, windowZIndices: {}, topZ: INITIAL_Z_INDEX }
  }
}

export function useDesktopLayout(userId) {
  const storageKey = getStorageKey(userId)

  const [layout, setLayout] = useState(() => ({
    key: storageKey,
    ...readPersistedLayout(storageKey),
  }))

  if (layout.key !== storageKey) {
    setLayout({
      key: storageKey,
      ...readPersistedLayout(storageKey),
    })
  }

  useEffect(() => {
    if (!storageKey || layout.key !== storageKey || typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          windowPositions: layout.windowPositions,
          windowZIndices: layout.windowZIndices,
        })
      )
    } catch {
      // Ignore storage quota or private mode errors
    }
  }, [storageKey, layout.key, layout.windowPositions, layout.windowZIndices])

  const bringToFront = useCallback((taskId) => {
    setLayout((prev) => {
      const nextZ = prev.topZ + 1
      return {
        ...prev,
        topZ: nextZ,
        windowZIndices: {
          ...prev.windowZIndices,
          [taskId]: nextZ,
        },
      }
    })
  }, [])

  const updateWindowPosition = useCallback((taskId, position) => {
    setLayout((prev) => ({
      ...prev,
      windowPositions: {
        ...prev.windowPositions,
        [taskId]: position,
      },
    }))
  }, [])

  const arrangeWindows = useCallback((tasks = []) => {
    const nextPositions = {}
    tasks.forEach((task, index) => {
      const col = index % 3
      const row = Math.floor(index / 3)
      nextPositions[task.id] = {
        x: 60 + col * 330,
        y: 50 + row * 260,
      }
    })
    setLayout((prev) => ({
      ...prev,
      windowPositions: {
        ...prev.windowPositions,
        ...nextPositions,
      },
    }))
  }, [])

  const resetLayout = useCallback(() => {
    setLayout({
      key: storageKey,
      windowPositions: {},
      windowZIndices: {},
      topZ: INITIAL_Z_INDEX,
    })
    if (storageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        // Ignore storage errors
      }
    }
  }, [storageKey])

  return {
    windowPositions: layout.windowPositions,
    windowZIndices: layout.windowZIndices,
    bringToFront,
    updateWindowPosition,
    arrangeWindows,
    resetLayout,
  }
}
