import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMeta } from '../services/metaService.js';

const router = Router();

router.get('/', requireAuth, (_req, res) => {
  res.json(getMeta());
});

export default router;
