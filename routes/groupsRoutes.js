import express from 'express';
import {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  updateGroupCoaches,
  updateGroupAdherents,
  updateGroupEmplacements
} from '../controllers/groupsController.js';

const router = express.Router();

// CRUD Groupes
router.post('/', createGroup);
router.get('/', getAllGroups);
router.get('/:id', getGroupById);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

// Route spécifique pour mettre à jour les coaches d'un groupe
router.put('/:id/coaches', updateGroupCoaches);

// Gestion des adhérents
router.put('/:id/adherents', updateGroupAdherents);

// Gestion des emplacements
router.put('/:id/emplacements', updateGroupEmplacements);

export default router;