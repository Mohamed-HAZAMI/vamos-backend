// versementsRoutes.js
import express from 'express';
import { getAllVersements, getVersementsStats } from '../controllers/versementsController.js';

const router = express.Router();

// Route pour tous les versements avec détails
router.get('/', getAllVersements);

// Route pour les statistiques uniquement (plus légère)
router.get('/stats', getVersementsStats);

export default router;