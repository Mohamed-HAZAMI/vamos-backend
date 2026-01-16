import express from 'express';
import {
  fetchEcoles,
  fetchEcoleById,
  addEcole,
  updateEcole,
  deleteEcole,
  fetchEcoleNames,
  fetchEcoleEmplacements,
  addEcoleEmplacements,
  updateEcoleEmplacements,
  fetchEcoleCoaches,
  addEcoleCoaches,
  updateEcoleCoaches
} from '../controllers/ecoleController.js';

import {authenticateToken , requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', fetchEcoles);
router.get('/names', fetchEcoleNames);
router.get('/:id', fetchEcoleById);
router.post('/', authenticateToken, requireAdmin , addEcole);
router.put('/:id', authenticateToken, requireAdmin , updateEcole);
router.delete('/:id', authenticateToken, requireAdmin , deleteEcole);
// Ajoutez ces nouvelles routes
router.get('/:id/emplacements', fetchEcoleEmplacements);
router.post('/:id/emplacements', addEcoleEmplacements);
router.put('/:id/emplacements', updateEcoleEmplacements);
// Ajoutez ces nouvelles routes pour les coaches
router.get('/:id/coaches', fetchEcoleCoaches);
router.post('/:id/coaches', addEcoleCoaches);
router.put('/:id/coaches', updateEcoleCoaches);

export default router;