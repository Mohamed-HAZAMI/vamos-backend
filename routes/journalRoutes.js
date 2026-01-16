import express from 'express';
import {
  getJournal,
  getJournalGrouped,
  getStatsDetails
} from '../controllers/journalController.js';

import { authenticateToken ,  requireAdmin} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken , requireAdmin, getJournal);
router.get('/grouped', authenticateToken , requireAdmin, getJournalGrouped);
router.get('/stats', authenticateToken , requireAdmin, getStatsDetails);

export default router;