import {
  createAbonnement,
  addCourseToAbonnement,
  getAllAbonnements,
  getAbonnementById,
  updateAbonnement,
  deleteAbonnement,
  getAbonnementByAdherentId,
  getMonthlySubscriptionTotal,
} from "../models/abonnementModel.js";

export const createAbonnementController = async (req, res) => {
  try {
    const data = req.body;
    const { abonnementId, facture_id, numero_facture, montant_ht, montant_tva, montant_total, taux_tva, adherents } = await createAbonnement(data);
    res.status(201).json({
      abonnement_id: abonnementId,
      facture_id,
      numero_facture,
      montant_ht,
      montant_tva,
      montant_total,
      taux_tva,
      adherents, // Include adherent details
      message: "Abonnement créé avec facture générée",
    });
  } catch (err) {
    console.error(`Error in createAbonnementController: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
};

export const addCourseToAbonnementController = async (req, res) => {
  try {
    const { id } = req.params;
    const { cours_id } = req.body;

    if (!cours_id) {
      return res.status(400).json({ message: "cours_id est requis" });
    }

    await addCourseToAbonnement(id, cours_id);
    res.status(200).json({ message: "Cours ajouté à l'abonnement avec succès" });
  } catch (err) {
    console.error(`Error in addCourseToAbonnementController: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
};

export const getAllAbonnementsController = async (req, res) => {
  try {
    const abonnements = await getAllAbonnements();
    res.status(200).json(abonnements);
  } catch (err) {
    console.error(`Error in getAllAbonnementsController: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
};

export const getAbonnementByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const abonnement = await getAbonnementById(id);
    if (!abonnement) {
      return res.status(404).json({ message: "Abonnement non trouvé" });
    }
    res.status(200).json(abonnement);
  } catch (err) {
    console.error(`Error in getAbonnementByIdController: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
};

export const updateAbonnementController = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await updateAbonnement(id, data);
    res.status(200).json({ message: "Abonnement mis à jour avec succès" });
  } catch (err) {
    console.error(`Error in updateAbonnementController: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
};

export const deleteAbonnementController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteAbonnement(id);
    res.status(200).json({ message: "Abonnement supprimé avec succès" });
  } catch (err) {
    console.error(`Error in deleteAbonnementController: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
};

export const getAbonnementByAdherentIdController = async (req, res) => {
  try {
    const { adherentId } = req.params;
    const abonnements = await getAbonnementByAdherentId(adherentId);
    res.status(200).json(abonnements);
  } catch (err) {
    console.error(`Error in getAbonnementByAdherentIdController: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
};

export const getMonthlySubscriptionTotalController = async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = Number(year);
    const monthNum = Number(month);

    if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ message: "Année invalide" });
    }
    if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: "Mois invalide" });
    }

    const result = await getMonthlySubscriptionTotal(yearNum, monthNum);
    res.status(200).json(result);
  } catch (err) {
    console.error(`Error in getMonthlySubscriptionTotalController: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
};