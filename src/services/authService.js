import { apiFetch } from '../lib/api'

export const authService = {
  login(email, password) {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
  },

  logout() {
    return apiFetch('/auth/logout', {
      method: 'POST',
    })
  },

  me() {
    return apiFetch('/auth/me')
  },

  changePassword(current_password, new_password) {
    return apiFetch('/auth/change-password', {
      method: 'POST',
      body: { current_password, new_password },
    })
  },
}
