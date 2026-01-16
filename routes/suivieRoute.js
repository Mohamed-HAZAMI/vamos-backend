import express from 'express';
import {
    getCommentairesByAdherent,
    createCommentaire,
    updateCommentaire,
    deleteCommentaire,
    getStatsAdherent
} from '../controllers/suivieController.js';

const router = express.Router();

// Routes pour les commentaires
router.get('/adherent/:id_adherent', getCommentairesByAdherent); // GET tous les commentaires d'un adhérent
router.get('/stats/:id_adherent', getStatsAdherent); // GET stats de suivi d'un adhérent
router.post('/', createCommentaire); // POST créer un commentaire
router.put('/:id', updateCommentaire); // PUT mettre à jour un commentaire
router.delete('/:id', deleteCommentaire); // DELETE supprimer un commentaire

export default router;