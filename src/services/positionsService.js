import { apiFetch } from '../lib/api'

export const positionsService = {
  async getPositions() {
    const data = await apiFetch('/positions')
    return data.positions || []
  },

  async createPosition(payload) {
    const data = await apiFetch('/positions', {
      method: 'POST',
      body: payload,
    })
    return data.position
  },

  async updatePosition(id, payload) {
    const data = await apiFetch(`/positions/${id}`, {
      method: 'PATCH',
      body: payload,
    })
    return data.position
  },

  async deletePosition(id) {
    return apiFetch(`/positions/${id}`, {
      method: 'DELETE',
    })
  },
}
