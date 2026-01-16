// routes/presenceCoachRoutes.js
import express from "express";
import { print, getCoachPresenceSummary } from "../controllers/presenceCoachController.js";

import { authenticateToken , requireAdmin} from "../middleware/authMiddleware.js";

const router = express.Router();

// Changer GET en POST pour pouvoir envoyer le body
router.post("/print", authenticateToken , requireAdmin, print);
router.post("/summary", authenticateToken , requireAdmin, getCoachPresenceSummary);

export default router;