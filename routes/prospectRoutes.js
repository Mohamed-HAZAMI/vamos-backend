import express from 'express';
import {
  getAllProspects,
  createProspect,
  updateProspect,
  updateProspectAction,
  getTotalProspects,
  getLastFiveProspects,
  getProspectsWithActions,
  deleteProspect   // Importer la méthode de suppression
} from '../controllers/prospectController.js';

const router = express.Router();

// Routes pour les prospects
router.get('/', getAllProspects);                       // Tous les prospects
router.post('/', createProspect);                       // Créer un prospect
router.put('/:id', updateProspect);                     // Mise à jour d'un prospect avec son ID
router.put('/:id/action', updateProspectAction);        // Modifier l'action d'un prospect
router.get('/count', getTotalProspects);                // Nombre total de prospects
router.get('/latest', getLastFiveProspects);            // Les 5 derniers prospects
router.get('/with-actions', getProspectsWithActions);   // Prospects avec leurs actions
router.delete('/:id', deleteProspect);                  // Supprimer un prospect avec son ID

export default router;
