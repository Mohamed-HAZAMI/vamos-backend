import express from 'express';
import {
  fetchDepenses,
  createDepense,
  getTotalDepenses,
  getTotalDepensesByPeriod
} from '../controllers/depensesController.js';

import { authenticateToken ,  requireAdmin} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, fetchDepenses);
router.post('/', authenticateToken, requireAdmin, createDepense);
router.get('/total', authenticateToken, requireAdmin, getTotalDepenses);
router.get('/total/period', authenticateToken, requireAdmin, getTotalDepensesByPeriod);

export default router;