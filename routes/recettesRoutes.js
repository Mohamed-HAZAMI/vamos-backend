import express from 'express';
import { 
    calculerRecettes, 
    getEcoles,
    getGroupesParEcole,
    getTousGroupes 
} from '../controllers/recettesController.js';
import { authenticateToken ,  requireAdmin} from '../middleware/authMiddleware.js';

const router = express.Router();

// Route pour récupérer la liste des écoles
router.get('/ecoles', authenticateToken , requireAdmin, getEcoles);

// Route pour récupérer tous les groupes
router.get('/groupes/tous', authenticateToken , requireAdmin, getTousGroupes);

// Route pour récupérer les groupes par école
router.get('/groupes/par-ecole', authenticateToken , requireAdmin, getGroupesParEcole);

// Route principale pour calculer les recettes
router.get('/periode', authenticateToken , requireAdmin, calculerRecettes);

export default router;