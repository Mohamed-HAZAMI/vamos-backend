import express from "express";
import {
  createAbonnementController,
  addCourseToAbonnementController,
  getAllAbonnementsController,
  getAbonnementByIdController,
  updateAbonnementController,
  deleteAbonnementController,
  getAbonnementByAdherentIdController,
  getMonthlySubscriptionTotalController,
} from "../controllers/abonnementController.js";
import pool from "../config/db.js";

const router = express.Router();

router.post("/", createAbonnementController);
router.get("/", getAllAbonnementsController);
router.get("/:id", getAbonnementByIdController);
router.get("/adherent/:adherentId", getAbonnementByAdherentIdController);
router.put("/:id", updateAbonnementController);
router.delete("/:id", deleteAbonnementController);
router.post("/:id/cours", addCourseToAbonnementController);

// Custom endpoint to add an emplacement to an abonnement
router.post("/:id/emplacement", async (req, res) => {
  try {
    const { id } = req.params;
    const { emplacement_id } = req.body;

    if (!emplacement_id) {
      return res.status(400).json({ message: "emplacement_id est requis" });
    }

    const [existing] = await pool.query(
      `SELECT * FROM abonnement_emplacement WHERE abonnement_id = ? AND emplacement_id = ?`,
      [id, emplacement_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Cet emplacement est déjà associé à cet abonnement" });
    }

    await pool.query(
      `INSERT INTO abonnement_emplacement (abonnement_id, emplacement_id) VALUES (?, ?)`,
      [id, emplacement_id]
    );

    res.status(200).json({ message: "Emplacement ajouté à l'abonnement avec succès" });
  } catch (err) {
    console.error("Error in addEmplacementToAbonnement:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Endpoint to get total monthly subscription prices
router.get("/total/:year/:month", getMonthlySubscriptionTotalController);

export default router;