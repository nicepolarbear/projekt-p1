import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { validateQuery } from '../middleware/validate.js';
import {
  getAuditLogs,
  getDashboardOverview,
  getDashboardTasks,
} from '../services/dashboardService.js';

const router = Router();
router.use(requireAuth, requireRoles('admin', 'dyrektor'));

const dashboardTasksQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    status_id: z.coerce.number().int().min(1).max(4).optional(),
    priority_id: z.coerce.number().int().min(1).max(4).optional(),
    assignee_id: z.coerce.number().int().positive().optional(),
    creator_id: z.coerce.number().int().positive().optional(),
    overdue_only: z.enum(['true', 'false', '1', '0']).optional(),
    in_trash: z.enum(['true', 'false', '1', '0']).optional(),
  })
  .strict();

const auditLogsQuerySchema = z
  .object({
    action: z.string().trim().max(100).optional(),
    actor_id: z.coerce.number().int().positive().optional(),
    entity_type: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

router.get('/overview', async (_req, res, next) => {
  try {
    const overview = await getDashboardOverview();
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

router.get('/tasks', validateQuery(dashboardTasksQuerySchema), async (req, res, next) => {
  try {
    const tasks = await getDashboardTasks(req.query);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.get('/audit-logs', validateQuery(auditLogsQuerySchema), async (req, res, next) => {
  try {
    const logs = await getAuditLogs(req.query);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
