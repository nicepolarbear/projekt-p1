import { apiFetch } from '../lib/api'

export const eventsService = {
  async getLatestId() {
    const data = await apiFetch('/events/latest-id')
    return data?.latestId ?? 0
  },

  async getEventsSince(sinceId = 0, limit = 50) {
    const data = await apiFetch(`/events?since_id=${sinceId}&limit=${limit}`)
    return data?.events ?? []
  },
}
