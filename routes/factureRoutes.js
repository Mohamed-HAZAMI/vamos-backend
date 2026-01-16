import express from "express";
import {
  createFactureHandler,
  getFacture,
  updateFactureStatusHandler,
  checkNumeroFactureHandler,
  updateFacturePaymentMethodHandler,
  getFacturePDFHandler,
} from "../controllers/factureController.js";

const router = express.Router();

router.post("/", createFactureHandler);
router.get("/:id", getFacture);
router.put("/:id/status", updateFactureStatusHandler);
router.get("/check-numero/:numero", checkNumeroFactureHandler);
router.put("/:id/payment-method", updateFacturePaymentMethodHandler);
router.get("/pdf/:chemin_pdf", getFacturePDFHandler);

export default router;