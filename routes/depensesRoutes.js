import express from 'express';
import {
  fetchDepenses,
  createDepense,
  getTotalDepenses,
  getTotalDepensesByPeriod
} from '../controllers/depensesController.js';

import { authenticateToken ,  requireAdmin , requireAdminOrCoach} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, requireAdminOrCoach , fetchDepenses);
router.post('/', authenticateToken, requireAdmin, createDepense);
router.get('/total', authenticateToken, requireAdminOrCoach , getTotalDepenses);
router.get('/total/period', authenticateToken, requireAdminOrCoach , getTotalDepensesByPeriod);

export default router;