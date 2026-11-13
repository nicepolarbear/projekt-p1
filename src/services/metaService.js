import { apiFetch } from '../lib/api'

export const metaService = {
  getMeta() {
    return apiFetch('/meta')
  },
}
