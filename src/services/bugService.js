import { apiFetch } from '../lib/api'

export const bugService = {
  /**
   * Pobiera listę publicznie dostępnych aplikacji
   * @returns {Promise<{ applications: Array<{ id: number, name: string, url: string, description: string, organization_name: string, organization_slug: string }> }>}
   */
  getPublicApplications() {
    return apiFetch('/applications/public')
  },

  /**
   * Wysyła zgłoszenie błędu (dla gościa lub zalogowanego)
   * @param {{
   *   application_id?: number | null,
   *   custom_url?: string | null,
   *   organization_id?: number | null,
   *   title: string,
   *   description: string,
   *   severity?: 'low' | 'normal' | 'high' | 'critical',
   *   attachment_url?: string | null,
   *   is_anonymous?: boolean,
   *   guest_name?: string | null,
   *   guest_email?: string | null
   * }} data
   * @returns {Promise<{ success: boolean, bug_id: number, tracking_code: string }>}
   */
  submitBugReport(data) {
    return apiFetch('/bugs/submit', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Pobiera szczegóły zgłoszenia na podstawie kodu śledzenia
   * @param {string} trackingCode
   * @returns {Promise<{ bug: object, comments: Array<object> }>}
   */
  trackBugByCode(trackingCode) {
    return apiFetch(`/bugs/track/${encodeURIComponent(trackingCode)}`)
  },

  /**
   * Dodaje komentarz do zgłoszenia błędu
   * @param {string} trackingCode
   * @param {{ content: string, author_name?: string }} data
   * @returns {Promise<{ comment: object }>}
   */
  addComment(trackingCode, data) {
    return apiFetch(`/bugs/track/${encodeURIComponent(trackingCode)}/comments`, {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Pobiera błędy zgłoszone przez bieżącego zalogowanego użytkownika
   * @returns {Promise<{ bugs: Array<object> }>}
   */
  getMyBugs() {
    return apiFetch('/bugs/my')
  },
}
