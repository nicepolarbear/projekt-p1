/**
 * Klient HTTP do komunikacji z backendem (/api).
 * Obsługuje sesyjne ciasteczka (credentials: 'include'), parsowanie JSON
 * oraz globalne przechwytywanie nieoczekiwanych odpowiedzi 401.
 */

export class ApiError extends Error {
  constructor({ status = 500, code = 'API_ERROR', message = 'Wystąpił błąd serwera', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let unauthorizedHandler = null

/**
 * Rejestruje callback wywoływany przy nieoczekiwanym błędzie 401
 * (z wyłączeniem endpointów /auth/login oraz /auth/me).
 */
export function registerUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === 'function' ? fn : null
  return () => {
    if (unauthorizedHandler === fn) {
      unauthorizedHandler = null
    }
  }
}

/**
 * Buduje query string z obiektu parametrów, pomijając puste wartości.
 */
export function buildQuery(params = {}) {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    searchParams.set(key, String(value))
  }
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

function normalizeApiPath(path) {
  if (!path) return '/api'
  if (path.startsWith('/api/') || path === '/api' || path.startsWith('/api?')) {
    return path
  }
  return `/api${path.startsWith('/') ? '' : '/'}${path}`
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

async function parseResponseBody(response) {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

/**
 * Podstawowa funkcja fetch dla API aplikacji.
 */
export async function apiFetch(path, options = {}) {
  const url = normalizeApiPath(path)
  const { body, headers: customHeaders, ...restOptions } = options

  const headers = new Headers(customHeaders || {})
  let preparedBody = body

  if (isPlainObject(body) || Array.isArray(body)) {
    preparedBody = JSON.stringify(body)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  } else if (typeof body === 'string') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  }

  let response
  try {
    response = await fetch(url, {
      ...restOptions,
      credentials: 'include',
      headers,
      body: preparedBody,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Nie udało się połączyć z serwerem. Sprawdź połączenie sieciowe.',
      details: err?.message || null,
    })
  }

  const data = await parseResponseBody(response)

  if (!response.ok) {
    const errorPayload = data?.error && typeof data.error === 'object' ? data.error : data
    const message =
      errorPayload?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      response.statusText ||
      'Wystąpił błąd zapytania'
    const code = errorPayload?.code || `HTTP_${response.status}`
    const details = errorPayload?.details ?? null

    const apiError = new ApiError({
      status: response.status,
      code,
      message,
      details,
    })

    const pathname = url.split('?')[0]
    if (
      response.status === 401 &&
      pathname !== '/api/auth/login' &&
      pathname !== '/api/auth/me'
    ) {
      unauthorizedHandler?.(apiError)
    }

    throw apiError
  }

  return data
}
