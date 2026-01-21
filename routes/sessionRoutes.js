import express from 'express';
import { 
  getSessionbyIdAdehrent, 
  getSeanceTotale 
} from '../controllers/sessionController.js';

const router = express.Router();

// Route pour les réservations
router.get('/adherent/:id', getSessionbyIdAdehrent);

// Route pour le nombre total de séances
router.get('/seances-totales/:id', getSeanceTotale);

export default router;