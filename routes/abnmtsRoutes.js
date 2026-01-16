import express from 'express';
import {
  createAbonnement,
  getAllAbonnements,
  getAbonnementById,
  updateAbonnement,
  deleteAbonnement,
  getAbonnementsByAdherent,
  getAbonnementsByCours,
  getAbonnementsByGroupe,
  checkAbonnementExists,
  getAbonnementsCount,
  getGroupesByCours,
  updatePaiement,
  getPaiementInfo,
  getPackDetails,
  getLastIdAbonnement,
  getAllAbonnementsNearExpiry,
  getAbonnementDetails, 
  addAdherentToAbonnement, 
  removeAdherentFromAbonnement,
  updateAbonnementAdherents,
  updateAbonnementPackCategorie,
  enregistrerVersement,
  getHistoriqueVersements,
  renewAbonnement,
  updateDateFinAbonnement
} from '../controllers/abnmtsController.js';

const router = express.Router();

router.post('/enregistrer-versement', enregistrerVersement);
router.get('/:abnmt_id/historique-versements', getHistoriqueVersements);

// Récupérer les détails d'un abonnement avec ses adhérents, écoles et groupes
router.get('/abnms/:id/details', getAbonnementDetails);

// Ajouter un adhérent à un abonnement
router.post('/abnms/:id/adherents', addAdherentToAbonnement);

// Supprimer un adhérent d'un abonnement
router.delete('/abnms/:id/adherents/:adherentId', removeAdherentFromAbonnement);

// Mettre à jour tous les adhérents d'un abonnement (remplacement complet)
router.put('/abnms/:id/adherents', updateAbonnementAdherents);

router.put('/abnms/:id/pack_categorie', updateAbonnementPackCategorie);

// Routes CRUD de base
router.post('/', createAbonnement);
router.post('/:id/renew', renewAbonnement);
router.get('/', getAllAbonnements);
router.get('/:id', getAbonnementById);
router.put('/:id', updateAbonnement);
router.delete('/:id', deleteAbonnement);

router.get('/pack/:id', getPackDetails);

router.get('/near_expiry/expiry', getAllAbonnementsNearExpiry);

// Routes spécifiques
router.get('/adherent/:adherent_id', getAbonnementsByAdherent);
router.get('/cours/:cours_id', getAbonnementsByCours);
router.get('/groupe/:groupe_id', getAbonnementsByGroupe);
router.get('/exists/:adherent_id/:cours_id', checkAbonnementExists);
router.get('/count/total', getAbonnementsCount);

// Nouvelle route pour les groupes par cours
router.get('/groupes/ecole/:cours_id', getGroupesByCours);

router.put('/:id/paiement', updatePaiement);

router.get('/:id/paiement-info', getPaiementInfo);

router.get('/abonnement/dernier-abonnement', getLastIdAbonnement);

router.patch('/:id/modify-date-fin', updateDateFinAbonnement);

export default router;