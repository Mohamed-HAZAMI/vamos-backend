import express from "express";
import {
  createPerformance,
  getPerformancesByAdherent,
  updatePerformance,
  deletePerformance,
  getPerformanceById,
  getAllPerformances,
  getLatestPerformance
} from "../controllers/performencesController.js";

const router = express.Router();

router.post("/", createPerformance);
router.get("/adherent/:adherent_id", getPerformancesByAdherent);
router.get("/latest/:adherent_id", getLatestPerformance); // Nouvelle route pour la dernière performance
router.get("/:id", getPerformanceById);
router.get("/", getAllPerformances);
router.put("/:id", updatePerformance);
router.delete("/:id", deletePerformance);

export default router;