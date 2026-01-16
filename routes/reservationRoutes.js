import express from 'express';
import {
  addNewReservation,
  getAllReservation,
  updateReservationRes,
  deleteReservation,
  getReservationAdherents,
  updateAdherentPresence,
  getGroupPresenceStats,
  addDupliquer,
  getAllReservationsByName,
  // Nouvelles fonctions pour les versements
  createVersement,
  getVersementsByReservation,
  updateAvanceFromVersements,
  updateVersement,
  deleteVersement,
  getReservationCoaches,
  updateCoachPresence
} from '../controllers/reservationController.js';

const router = express.Router();

// Routes existantes
router.post('/resNew', addNewReservation);
router.get('/res', getAllReservation);
router.put('/res/:id', updateReservationRes);
router.delete('/res/:id', deleteReservation);
router.get('/resByName', getAllReservationsByName);


// Nouvelles routes pour les versements
router.post('/versements', createVersement);
router.get('/versements/:reservation_id', getVersementsByReservation);
router.put('/versements/:id', updateVersement); // NOUVELLE ROUTE
router.delete('/versements/:id', deleteVersement); // NOUVELLE ROUTE
router.put('/res/:id/update-avance', updateAvanceFromVersements);

// Routes pour la gestion des adhérents
router.put('/:reservationId/adherents/:adherentId/groupId/:groupId/courId/:courId', updateAdherentPresence);
router.get('/:reservationId/adherents', getReservationAdherents);

// Routes pour la gestion des coaches
router.put('/:reservationId/coaches/:coachesId/groupId/:groupId/courId/:courId', updateCoachPresence);
router.get('/:reservationId/coaches', getReservationCoaches);


router.get('/group/:groupId/cours/:courId/presences', getGroupPresenceStats);
router.post('/dupliquer/:reservationId', addDupliquer);


export default router;