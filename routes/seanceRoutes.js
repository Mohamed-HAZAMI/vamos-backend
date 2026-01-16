import express from "express";
import {
  createSeance,
  getAllSeances,
  getSeanceById,
  deleteSeance,
  updateSeance,
  updateSeanceDate,
  getSeancesByAdherent,
  checkCoachAvailability,
  checkEmplacementAvailability,
  getSeancesByCriteria,
  getAllSeancesWithDetails,
  getSeanceByIdWithDetails,
  getSeancesByAdherentWithDetails,
  getSeanceDetailsBySeanceId,
  getSeancesByEmplacement,
  checkAllTerrainsAvailability,
  checkAllCoachesAvailability,
  getSeancesByFactureId,
} from "../controllers/seanceController.js";

const router = express.Router();

// CRUD routes
router.post("/", createSeance);
router.get("/", getAllSeances);
router.get("/details", getAllSeancesWithDetails);
router.get("/check-all-terrains-availability", checkAllTerrainsAvailability);
router.get("/check-all-coaches-availability", checkAllCoachesAvailability);
router.get("/search", getSeancesByCriteria);
router.get("/adherent/:adherentId", getSeancesByAdherent);
router.get("/adherent/:adherentId/details", getSeancesByAdherentWithDetails);
router.get("/emplacement/:emplacementId", getSeancesByEmplacement);
router.get("/seance-details/:seanceId", getSeanceDetailsBySeanceId);
router.get("/:id", getSeanceById);
router.get("/details/:id", getSeanceByIdWithDetails);
router.put("/:id", updateSeance);
router.put("/:id/date", updateSeanceDate);
router.delete("/:id", deleteSeance);
router.get("/by-facture/:factureId", getSeancesByFactureId);

// Specific routes
router.post("/check-coach", checkCoachAvailability);
router.post("/check-emplacement", checkEmplacementAvailability);

export default router;