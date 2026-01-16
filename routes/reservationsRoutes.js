import express from 'express';
import {
  addReservation,
  getReservations,
  getReservation,
  editReservation,
  updateReservationDate,
  removeReservation,
  getReservationsWithFacture,
  getReservationDetails,
  getFullReservationDetails,
  getReservationDetailsById,
  getReservationsByEmplacement,
  checkEmplacementAvailability,
  checkAllTerrainsAvailability,
  checkTerrainAvailability,
  getMonthlyReservationTotalController,
  getReservationsByFactureIdController,

  addNewReservation,
  getAllReservation,
  updateReservationRes,
  deleteReservation
} from '../controllers/reservationsController.js';

const router = express.Router();

router.post('/resNew', addNewReservation);
router.get('/res', getAllReservation);
router.put('/res/:id', updateReservationRes);
router.delete('/res/:id', deleteReservation);

// Routes RESTful
router.post('/', addReservation);
router.get('/', getReservations);
router.get('/check-all-terrains-availability', checkAllTerrainsAvailability);
router.get('/check-terrain-availability', checkTerrainAvailability);
router.get('/details/:adherentId', getReservationDetails);
router.get('/with-facture', getReservationsWithFacture);
router.get('/full-details/:id', getFullReservationDetails);
router.get('/reservation-details/:reservationId', getReservationDetailsById);
router.get('/emplacement/:emplacementId', getReservationsByEmplacement);
router.post('/check-emplacement', checkEmplacementAvailability);
router.get('/:id', getReservation);
router.put('/:id', editReservation);
router.put('/:id/date', updateReservationDate);
router.delete('/:id', removeReservation);
router.get('/total/:year/:month', getMonthlyReservationTotalController);
router.get('/by-facture/:factureId', getReservationsByFactureIdController);



export default router;