import { apiFetch } from '../lib/api'

export const profileService = {
  getProfile() {
    return apiFetch('/profile')
  },

  updateProfile(data) {
    return apiFetch('/profile', {
      method: 'PATCH',
      body: data,
    })
  },

  updatePreferences(prefs) {
    return apiFetch('/profile/preferences', {
      method: 'PATCH',
      body: prefs,
    })
  },

  getStats() {
    return apiFetch('/profile/stats')
  },
}
