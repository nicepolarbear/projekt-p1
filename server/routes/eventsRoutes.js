import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/connection.js';
import { fetchEventsForUser } from '../services/eventsService.js';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/events/latest-id
 * Zwraca najnowszy identyfikator zdarzenia, aby klient mógł zainicjalizować wskaźnik
 * bez wyświetlania starych powiadomień przy pierwszym załadowaniu strony.
 */
router.get('/latest-id', async (_req, res, next) => {
  try {
    const db = getDb();
    const row = await db.prepare('SELECT MAX(id) AS max_id FROM live_events').get();
    const latestId = Number(row?.max_id || 0);
    res.json({ ok: true, latestId });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/events?since_id=123
 * Pobiera nowe zdarzenia live dla zalogowanego użytkownika od danego identyfikatora.
 */
router.get('/', async (req, res, next) => {
  try {
    const sinceId = Number(req.query.since_id) || 0;
    const limit = Number(req.query.limit) || 50;

    const result = await fetchEventsForUser({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      sinceId,
      limit,
    });

    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
