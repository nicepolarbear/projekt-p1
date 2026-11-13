import { apiFetch, buildQuery } from '../lib/api'

export const dashboardService = {
  getOverview() {
    return apiFetch('/dashboard/overview')
  },

  getDashboardTasks(params = {}) {
    return apiFetch(`/dashboard/tasks${buildQuery(params)}`)
  },

  getAuditLogs(params = {}) {
    return apiFetch(`/dashboard/audit-logs${buildQuery(params)}`)
  },
}
