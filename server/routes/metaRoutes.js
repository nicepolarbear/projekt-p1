import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMeta } from '../services/metaService.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  res.json(await getMeta());
});

export default router;
