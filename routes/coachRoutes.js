import express from 'express';
import {
  createCoach,
  getAllCoaches,
  getAllCoachNames,
  getCoachById,
  updateCoach,
  deleteCoach,
  getSalaireMensuel,
  getSeancesByMonth
} from '../controllers/coachController.js';

import { authenticateToken ,  requireAdmin} from '../middleware/authMiddleware.js'; 

const router = express.Router();

// Routes pour les coaches
router.post('/', authenticateToken , requireAdmin, createCoach); // Créer un coach
router.get('/', authenticateToken , requireAdmin, getAllCoaches); // Récupérer tous les coaches
router.get('/names', authenticateToken , requireAdmin, getAllCoachNames); // Récupérer les noms des coaches
router.get('/:id', authenticateToken , requireAdmin, getCoachById); // Récupérer un coach par ID
router.put('/:id', authenticateToken , requireAdmin, updateCoach); // Mettre à jour un coach
router.delete('/:id', authenticateToken , requireAdmin, deleteCoach); // Supprimer un coach
router.get('/:id/salaire/:annee/:mois', authenticateToken , requireAdmin, getSalaireMensuel); // Calculer le salaire mensuel
router.get('/:id/seances/:annee', authenticateToken , requireAdmin, getSeancesByMonth); // Récupérer les séances par mois avec salaire

export default router;