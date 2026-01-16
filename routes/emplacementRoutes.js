import express from 'express';
import {
  fetchEmplacements,
  fetchEmplacementById,
  addEmplacement,
  updateEmplacement,
  deleteEmplacement,
  fetchEmplacementNames,
  fetchEmplacementTypes
} from '../controllers/emplacementController.js';

const router = express.Router();

router.get('/', fetchEmplacements);
router.get('/names', fetchEmplacementNames);
router.get('/types', fetchEmplacementTypes);
router.get('/:id', fetchEmplacementById);
router.post('/', addEmplacement);
router.put('/:id', updateEmplacement);
router.delete('/:id', deleteEmplacement);

export default router;