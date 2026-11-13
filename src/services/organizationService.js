import { apiFetch } from '../lib/api'

export const organizationService = {
  async getJoinCodes() {
    const data = await apiFetch('/organizations/join-codes')
    return data.codes || []
  },

  async createJoinCode(payload = {}) {
    const data = await apiFetch('/organizations/join-codes', {
      method: 'POST',
      body: payload,
    })
    return data.code
  },

  async getJoinRequests() {
    const data = await apiFetch('/organizations/join-requests')
    return data.requests || []
  },

  async approveJoinRequest(id, payload = {}) {
    return apiFetch(`/organizations/join-requests/${id}/approve`, {
      method: 'POST',
      body: payload,
    })
  },

  async rejectJoinRequest(id) {
    return apiFetch(`/organizations/join-requests/${id}/reject`, {
      method: 'POST',
    })
  },
}
