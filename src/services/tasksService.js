import { apiFetch, buildQuery } from '../lib/api'

export const tasksService = {
  getTasks(scope = 'active') {
    return apiFetch(`/tasks${buildQuery({ scope })}`)
  },

  createTask(payload) {
    return apiFetch('/tasks', {
      method: 'POST',
      body: payload,
    })
  },

  updateTask(id, payload) {
    return apiFetch(`/tasks/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  },

  updateTaskStatus(id, status_id) {
    return apiFetch(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: { status_id },
    })
  },

  deleteTask(id) {
    return apiFetch(`/tasks/${id}`, {
      method: 'DELETE',
    })
  },

  restoreTask(id) {
    return apiFetch(`/tasks/${id}/restore`, {
      method: 'POST',
    })
  },

  assignTask(taskId, payload) {
    return apiFetch(`/tasks/${taskId}/assignments`, {
      method: 'POST',
      body: payload,
    })
  },

  respondToAssignment(taskId, payload) {
    return apiFetch(`/tasks/${taskId}/assignments/respond`, {
      method: 'PATCH',
      body: payload,
    })
  },
}
