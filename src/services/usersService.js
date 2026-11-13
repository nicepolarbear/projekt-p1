import { apiFetch, buildQuery } from '../lib/api'

export const usersService = {
  getAdminUsers(params = {}) {
    return apiFetch(`/admin/users${buildQuery(params)}`)
  },

  createUser(payload) {
    return apiFetch('/admin/users', {
      method: 'POST',
      body: payload,
    })
  },

  updateUser(id, payload) {
    return apiFetch(`/admin/users/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  },

  deactivateUser(id) {
    return apiFetch(`/admin/users/${id}`, {
      method: 'DELETE',
    })
  },
}
