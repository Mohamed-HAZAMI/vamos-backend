import express from 'express';
import {
    createCours,
    getAllCours,
    getCoursById,
    updateCours,
    deleteCours,
    getCoursCount,
    fetchCoursNames
} from '../controllers/coursController.js';

const router = express.Router();

// Routes pour les cours
router.post('/', createCours); // Créer un cours
router.get('/', getAllCours); // Obtenir tous les cours
router.get('/names', fetchCoursNames); // Obtenir les noms de tous les cours
router.get('/count', getCoursCount); // Obtenir le nombre total de cours
router.get('/:id', getCoursById); // Obtenir un cours par ID
router.put('/:id', updateCours); // Mettre à jour un cours
router.delete('/:id', deleteCours); // Supprimer un cours

export default router;