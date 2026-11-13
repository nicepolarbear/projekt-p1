import { apiFetch } from '../lib/api'

export const onboardingService = {
  /**
   * Sprawdza dostępność sluga organizacji
   * @param {string} slug
   * @returns {Promise<{ available: boolean, slug: string }>}
   */
  checkSlug(slug) {
    return apiFetch('/onboarding/check-slug', {
      method: 'POST',
      body: { slug },
    })
  },

  /**
   * Rejestracja zwykłego użytkownika (indywidualnego zgłaszającego)
   * @param {{ first_name: string, last_name: string, email: string, password: string }} data
   * @returns {Promise<{ success: boolean, user: object }>}
   */
  registerIndividual(data) {
    return apiFetch('/onboarding/register-individual', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Tworzy nową organizację i administratora
   * @param {{ first_name: string, last_name: string, email: string, password: string, org_name: string, org_slug?: string, industry?: string, size?: string }} data
   * @returns {Promise<{ success: boolean, user: object, organization: object }>}
   */
  createOrganization(data) {
    return apiFetch('/onboarding/create-organization', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Weryfikuje kod dołączenia do organizacji
   * @param {string} code
   * @returns {Promise<{ valid: boolean, code: string, organization: { id: number, name: string, slug: string }, suggested_position: string | null }>}
   */
  verifyJoinCode(code) {
    return apiFetch('/onboarding/verify-join-code', {
      method: 'POST',
      body: { code },
    })
  },

  /**
   * Składa wniosek o dołączenie do firmy za pomocą kodu
   * @param {{ code: string, first_name: string, last_name: string, email: string, password: string }} data
   * @returns {Promise<{ pending: boolean, message: string }>}
   */
  joinWithCode(data) {
    return apiFetch('/onboarding/join-with-code', {
      method: 'POST',
      body: data,
    })
  },
}
