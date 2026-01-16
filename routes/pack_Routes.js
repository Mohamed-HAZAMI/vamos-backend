import express from 'express';
import packCategorie_Controller from '../controllers/packCategorie_Controller.js';

import { authenticateToken ,  requireAdmin} from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes pour les catégories de packs
router.get('/', authenticateToken, requireAdmin, packCategorie_Controller.getAllPackCategories);
router.get('/:id', authenticateToken, requireAdmin, packCategorie_Controller.getPackCategoryById);
router.post('/', authenticateToken, requireAdmin, packCategorie_Controller.createPackCategory);
router.put('/:id', authenticateToken, requireAdmin, packCategorie_Controller.updatePackCategory);
router.delete('/:id', authenticateToken, requireAdmin, packCategorie_Controller.deletePackCategory);
export default router;