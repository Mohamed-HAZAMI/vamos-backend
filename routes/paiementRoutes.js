import express from 'express';
import {
    getAllPaiement,
    addPaiement
} from '../controllers/paiementController.js';

const router = express.Router();

router.get('/historique/:idAdherent', getAllPaiement);
router.post('/ajouter', addPaiement);

export default router;