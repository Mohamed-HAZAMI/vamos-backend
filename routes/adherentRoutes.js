import express from 'express';
import {
  createAdherent,
  getAllAdherents,
  getAllAdherentNames,
  getAdherentById,
  updateAdherent,
  updateAdherentImage,
  deleteAdherent,
  getAdherentStats,
  getTotalAdherents,
  getAdherentByGroupeBydate,
  getAdherentByEcoleBycour,
  archiveAdherent,
  unarchiveAdherent,

  updateImage1,
  updateImage2,
  updateImage3,
  updateMultipleImages,
  deleteImage,
  getAllImages,
  getImage
} from '../controllers/adherentController.js';

import { authenticateToken , requireAdmin , requireAdminOrCoach} from "../middleware/authMiddleware.js";

// Importez les nouveaux contrôleurs pour les images

const router = express.Router();

// Routes existantes
router.post('/', authenticateToken , requireAdmin, createAdherent);
router.get('/', authenticateToken , requireAdminOrCoach , getAllAdherents);
router.get('/groupe/:idGroupe/ecole/:idCour', getAdherentByEcoleBycour);
router.get('/names', authenticateToken , requireAdmin, getAllAdherentNames);
router.get('/stats', authenticateToken , requireAdmin, getAdherentStats);
router.get('/total', authenticateToken , requireAdmin, getTotalAdherents);
router.get('/:id', authenticateToken , getAdherentById);
router.put('/:id' , authenticateToken , updateAdherent);
router.delete('/:id', authenticateToken , requireAdmin, deleteAdherent);
router.get('/groupe/:idGroupe/date/:jour/ecole/:idCour', getAdherentByGroupeBydate);
router.patch('/:id/archive', authenticateToken , requireAdmin, archiveAdherent);
router.patch('/:id/unarchive', authenticateToken , requireAdmin, unarchiveAdherent);

// Routes pour l'image principale (existant)
router.patch('/:id/image', authenticateToken , requireAdmin, updateAdherentImage);

// Nouvelles routes pour image1, image2, image3
router.patch('/:id/image1', authenticateToken , requireAdmin, updateImage1);
router.patch('/:id/image2', authenticateToken , requireAdmin, updateImage2);
router.patch('/:id/image3', authenticateToken , requireAdmin, updateImage3);

// Route pour mettre à jour plusieurs images en une fois
router.patch('/:id/images', authenticateToken , requireAdmin, updateMultipleImages);

// Route pour supprimer une image spécifique
router.delete('/:id/images/:field', authenticateToken , requireAdmin, deleteImage);

// Route pour récupérer toutes les images
router.get('/:id/images', authenticateToken , requireAdmin, getAllImages);

// Route pour récupérer une image spécifique
router.get('/:id/images/:field', authenticateToken , requireAdmin, getImage);

export default router;