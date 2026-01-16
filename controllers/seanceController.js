import * as seanceModel from "../models/seanceModel.js";
import { createFacture } from "../models/factureModel.js";
import pool from "../config/db.js";

// Create a session with automatic invoice generation
export const createSeance = async (req, res) => {
  try {
    const {
      nom,
      adherentId,
      emplacementId,
      coachId,
      coursId,
      dateSeance,
      heureDebut,
      heureFin,
      prix,
      statut,
    } = req.body;

    // Validate required fields
    if (!dateSeance || !heureDebut || !heureFin || !emplacementId || !prix || !statut) {
      return res.status(400).json({ error: "Les champs dateSeance, heureDebut, heureFin, emplacementId, prix et statut sont requis." });
    }

    // Validate date and time formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateSeance) || !/^\d{2}:\d{2}:\d{2}$/.test(heureDebut) || !/^\d{2}:\d{2}:\d{2}$/.test(heureFin)) {
      return res.status(400).json({ error: "Format de date ou d'heure invalide." });
    }

    // Validate time order and range (08:00-22:00)
    const startDate = new Date(`1970-01-01T${heureDebut}`);
    const endDate = new Date(`1970-01-01T${heureFin}`);
    const minTime = new Date(`1970-01-01T08:00:00`);
    const maxTime = new Date(`1970-01-01T22:00:00`);
    if (startDate >= endDate) {
      return res.status(400).json({ error: "L'heure de début doit être antérieure à l'heure de fin." });
    }
    if (startDate < minTime || endDate > maxTime) {
      return res.status(400).json({ error: "Les heures doivent être entre 08:00 et 22:00." });
    }

    // Validate prix
    const prixNum = Number(prix);
    if (isNaN(prixNum) || prixNum < 0 || prixNum > 10000) {
      return res.status(400).json({ error: "Prix invalide (doit être entre 0 et 10000)." });
    }

    // Validate emplacementId
    if (isNaN(Number(emplacementId))) {
      return res.status(400).json({ error: "emplacementId invalide." });
    }

    // Check availability
    if (!(await seanceModel.checkEmplacementAvailability(emplacementId, dateSeance, heureDebut, heureFin))) {
      return res.status(400).json({ error: "Emplacement déjà réservé pour ce créneau." });
    }
    if (coachId && !(await seanceModel.checkCoachAvailability(coachId, dateSeance, heureDebut, heureFin))) {
      return res.status(400).json({ error: "Coach non disponible pour ce créneau." });
    }

    // Start a transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Create session
      const seanceData = {
        nom: nom || null,
        adherentId: adherentId || null,
        emplacementId,
        coachId: coachId || null,
        coursId: coursId || null,
        dateSeance,
        heureDebut,
        heureFin,
        prix: prixNum,
        statut,
        factureId: null,
      };

      const result = await seanceModel.createSeance(seanceData);
      const seanceId = result.insertId;

      // Generate invoice
      const VAT_RATE = 20.0;
      const montant_ht = prixNum;
      const montant_tva = (montant_ht * VAT_RATE) / 100;
      const montant_total = montant_ht + montant_tva;

      const description = `Séance ${nom || "sans nom"} le ${dateSeance} de ${heureDebut.slice(0, 5)} à ${heureFin.slice(0, 5)}`;
      const dateEmission = new Date().toISOString().split("T")[0];
      const dateEcheance = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split("T")[0];

      const invoiceData = {
        montant_ht: montant_ht.toFixed(2),
        taux_tva: VAT_RATE,
        montant_tva: montant_tva.toFixed(2),
        montant_total: montant_total.toFixed(2),
        date_creation: dateEmission,
        date_echeance: dateEcheance,
        description,
        statut: "en attente",
        mode_paiement: "non défini",
      };

      const { facture_id, numero_facture } = await createFacture(invoiceData);

      // Update session with facture_id
      await connection.query(`UPDATE seances SET factureId = ? WHERE id = ?`, [facture_id, seanceId]);

      // Fetch adherent information
      let adherent = null;
      if (adherentId) {
        const [adherentRows] = await connection.query(
          `SELECT id, nom, prenom, CONCAT(nom, ' ', prenom) AS full_name FROM adherents WHERE id = ?`,
          [adherentId]
        );
        adherent = adherentRows[0] ? {
          id: adherentRows[0].id,
          nom: adherentRows[0].nom,
          prenom: adherentRows[0].prenom,
          full_name: adherentRows[0].full_name,
        } : null;
      }

      await connection.commit();

      res.status(201).json({
        message: "Séance créée avec succès",
        seanceId,
        facture_id,
        numero_facture,
        montant_ht: invoiceData.montant_ht,
        montant_tva: invoiceData.montant_tva,
        montant_total: invoiceData.montant_total,
        taux_tva: invoiceData.taux_tva,
        adherent,
      });
    } catch (err) {
      await connection.rollback();
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: "Adherent, emplacement, coach ou cours non trouvé." });
      }
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Erreur createSeance:', err);
    res.status(500).json({ error: `Erreur lors de la création de la séance: ${err.message}` });
  }
};

// Get all sessions
export const getAllSeances = async (req, res) => {
  try {
    const seances = await seanceModel.getAllSeances();
    res.status(200).json(seances);
  } catch (err) {
    console.error('Erreur getAllSeances:', err);
    res.status(500).json({ error: `Erreur lors de la récupération des séances: ${err.message}` });
  }
};

// Get a session by ID
export const getSeanceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "ID de séance invalide." });
    }
    const seance = await seanceModel.getSeanceById(id);
    if (!seance) return res.status(404).json({ error: "Séance introuvable." });
    res.status(200).json(seance);
  } catch (err) {
    console.error('Erreur getSeanceById:', err);
    res.status(500).json({ error: `Erreur lors de la récupération de la séance: ${err.message}` });
  }
};

// Update a session
export const updateSeance = async (req, res) => {
  try {
    const {
      nom,
      adherentId,
      emplacementId,
      coachId,
      coursId,
      dateSeance,
      heureDebut,
      heureFin,
      prix,
      statut,
    } = req.body;
    const { id } = req.params;

    // Validate date and time if provided
    if (dateSeance && heureDebut && heureFin) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateSeance) || !/^\d{2}:\d{2}:\d{2}$/.test(heureDebut) || !/^\d{2}:\d{2}:\d{2}$/.test(heureFin)) {
        return res.status(400).json({ error: "Format de date ou d'heure invalide." });
      }
      const startDate = new Date(`1970-01-01T${heureDebut}`);
      const endDate = new Date(`1970-01-01T${heureFin}`);
      const minTime = new Date(`1970-01-01T08:00:00`);
      const maxTime = new Date(`1970-01-01T22:00:00`);
      if (startDate >= endDate) {
        return res.status(400).json({ error: "L'heure de début doit être antérieure à l'heure de fin." });
      }
      if (startDate < minTime || endDate > maxTime) {
        return res.status(400).json({ error: "Les heures doivent être entre 08:00 et 22:00." });
      }
    }

    // Validate prix if provided
    if (prix !== undefined) {
      const prixNum = Number(prix);
      if (isNaN(prixNum) || prixNum < 0 || prixNum > 10000) {
        return res.status(400).json({ error: "Prix invalide (doit être entre 0 et 10000)." });
      }
    }

    // Validate emplacementId if provided
    if (emplacementId && isNaN(Number(emplacementId))) {
      return res.status(400).json({ error: "emplacementId invalide." });
    }

    // Check availability if updating time or emplacement
    if (emplacementId && dateSeance && heureDebut && heureFin) {
      const isAvailable = await seanceModel.checkEmplacementAvailability(emplacementId, dateSeance, heureDebut, heureFin, id);
      if (!isAvailable) {
        return res.status(400).json({ error: "Emplacement déjà réservé pour ce créneau." });
      }
    }
    if (coachId && dateSeance && heureDebut && heureFin) {
      const isCoachAvailable = await seanceModel.checkCoachAvailability(coachId, dateSeance, heureDebut, heureFin, id);
      if (!isCoachAvailable) {
        return res.status(400).json({ error: "Coach non disponible pour ce créneau." });
      }
    }

    const result = await seanceModel.updateSeance(id, {
      nom,
      adherentId,
      emplacementId,
      coachId,
      coursId,
      dateSeance,
      heureDebut,
      heureFin,
      prix,
      statut,
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Séance introuvable." });
    }
    res.status(200).json({ message: "Séance mise à jour." });
  } catch (err) {
    console.error('Erreur updateSeance:', err);
    res.status(500).json({ error: `Erreur lors de la mise à jour de la séance: ${err.message}` });
  }
};

// Update only the date of a session
export const updateSeanceDate = async (req, res) => {
  try {
    const { dateSeance, heureDebut, heureFin, excludeSeanceId } = req.body;
    const { id } = req.params;

    if (!dateSeance || !/^\d{4}-\d{2}-\d{2}$/.test(dateSeance)) {
      return res.status(400).json({ error: "dateSeance requis et doit être au format YYYY-MM-DD." });
    }

    const seance = await seanceModel.getSeanceById(id);
    if (!seance) {
      return res.status(404).json({ error: "Séance introuvable." });
    }

    const checkHeureDebut = heureDebut || seance.heureDebut;
    const checkHeureFin = heureFin || seance.heureFin;

    // Validate time range (08:00-22:00)
    if (checkHeureDebut && checkHeureFin) {
      const startDate = new Date(`1970-01-01T${checkHeureDebut}`);
      const endDate = new Date(`1970-01-01T${checkHeureFin}`);
      const minTime = new Date(`1970-01-01T08:00:00`);
      const maxTime = new Date(`1970-01-01T22:00:00`);
      if (startDate >= endDate) {
        return res.status(400).json({ error: "L'heure de début doit être antérieure à l'heure de fin." });
      }
      if (startDate < minTime || endDate > maxTime) {
        return res.status(400).json({ error: "Les heures doivent être entre 08:00 et 22:00." });
      }
    }

    if (seance.emplacementId && checkHeureDebut && checkHeureFin) {
      const isEmplacementAvailable = await seanceModel.checkEmplacementAvailability(
        seance.emplacementId,
        dateSeance,
        checkHeureDebut,
        checkHeureFin,
        excludeSeanceId || id
      );
      if (!isEmplacementAvailable) {
        return res.status(400).json({ error: "Emplacement déjà réservé pour ce créneau." });
      }
    }

    if (seance.coachId && checkHeureDebut && checkHeureFin) {
      const isCoachAvailable = await seanceModel.checkCoachAvailability(
        seance.coachId,
        dateSeance,
        checkHeureDebut,
        checkHeureFin,
        excludeSeanceId || id
      );
      if (!isCoachAvailable) {
        return res.status(400).json({ error: "Coach non disponible pour ce créneau." });
      }
    }

    const result = await seanceModel.updateSeanceDate(id, dateSeance);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Séance introuvable." });
    }
    res.status(200).json({ message: "Date de la séance mise à jour." });
  } catch (err) {
    console.error('Erreur updateSeanceDate:', err);
    res.status(500).json({ error: `Erreur lors de la mise à jour de la date: ${err.message}` });
  }
};

// Delete a session and its associated invoice
export const deleteSeance = async (req, res) => {
  try {
    const seanceId = req.params.id;
    if (isNaN(Number(seanceId))) {
      return res.status(400).json({ error: "ID de séance invalide." });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [seanceRows] = await connection.query(`SELECT factureId FROM seances WHERE id = ?`, [seanceId]);
      if (seanceRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Séance introuvable." });
      }

      const factureId = seanceRows[0].factureId;

      if (factureId) {
        const [factureResult] = await connection.query(`DELETE FROM factures WHERE id = ?`, [factureId]);
        if (factureResult.affectedRows === 0) {
          console.warn(`No invoice found with factureId: ${factureId}`);
        }
      }

      const [seanceResult] = await connection.query(`DELETE FROM seances WHERE id = ?`, [seanceId]);
      if (seanceResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Séance introuvable." });
      }

      await connection.commit();
      res.status(200).json({ message: "Séance et facture associée supprimées avec succès." });
    } catch (err) {
      await connection.rollback();
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ error: "Impossible de supprimer la séance en raison de contraintes de clé étrangère." });
      }
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Erreur deleteSeance:', err);
    res.status(500).json({ error: `Erreur lors de la suppression de la séance: ${err.message}` });
  }
};

// Get sessions by adherent
export const getSeancesByAdherent = async (req, res) => {
  try {
    const { adherentId } = req.params;
    if (isNaN(Number(adherentId))) {
      return res.status(400).json({ error: "ID d'adhérent invalide." });
    }
    const rows = await seanceModel.getSeancesByAdherent(adherentId);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur getSeancesByAdherent:', err);
    res.status(500).json({ error: `Erreur lors de la récupération des séances: ${err.message}` });
  }
};

// Get sessions by emplacement
export const getSeancesByEmplacement = async (req, res) => {
  try {
    const { emplacementId } = req.params;
    if (!emplacementId || isNaN(Number(emplacementId))) {
      return res.status(400).json({ error: "ID de l'emplacement invalide." });
    }
    const seances = await seanceModel.getSeancesByEmplacementId(emplacementId);
    if (!seances.length) {
      return res.status(404).json({ error: "Aucune séance trouvée pour cet emplacement." });
    }
    res.status(200).json(seances);
  } catch (err) {
    console.error('Erreur getSeancesByEmplacement:', err);
    res.status(500).json({ error: `Erreur lors de la récupération des séances: ${err.message}` });
  }
};

// Check coach availability
export const checkCoachAvailability = async (req, res) => {
  try {
    const { coachId, date, start_time, end_time, excludeSeanceId } = req.body;
    if (!coachId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "coachId et date (YYYY-MM-DD) sont requis." });
    }

    // Validate time if provided
    if (start_time && end_time) {
      if (!/^\d{2}:\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}:\d{2}$/.test(end_time)) {
        return res.status(400).json({ error: "Format d'heure invalide." });
      }
      const startDate = new Date(`1970-01-01T${start_time}`);
      const endDate = new Date(`1970-01-01T${end_time}`);
      const minTime = new Date(`1970-01-01T08:00:00`);
      const maxTime = new Date(`1970-01-01T22:00:00`);
      if (startDate >= endDate) {
        return res.status(400).json({ error: "L'heure de début doit être antérieure à l'heure de fin." });
      }
      if (startDate < minTime || endDate > maxTime) {
        return res.status(400).json({ error: "Les heures doivent être entre 08:00 et 22:00." });
      }
    }

    const result = await seanceModel.checkCoachAvailability(coachId, date, start_time, end_time, excludeSeanceId);

    if (start_time && end_time) {
      res.status(200).json({
        available: result,
        message: result ? "Coach disponible" : "Coach indisponible",
      });
    } else {
      res.status(200).json(result);
    }
  } catch (err) {
    console.error('Erreur checkCoachAvailability:', err);
    res.status(500).json({ error: `Erreur lors de la vérification des créneaux: ${err.message}` });
  }
};

// Check emplacement availability
export const checkEmplacementAvailability = async (req, res) => {
  try {
    const { emplacementId, date, start_time, end_time, excludeSeanceId } = req.body;
    if (!emplacementId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "emplacementId et date (YYYY-MM-DD) sont requis." });
    }

    // Validate time if provided
    if (start_time && end_time) {
      if (!/^\d{2}:\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}:\d{2}$/.test(end_time)) {
        return res.status(400).json({ error: "Format d'heure invalide." });
      }
      const startDate = new Date(`1970-01-01T${start_time}`);
      const endDate = new Date(`1970-01-01T${end_time}`);
      const minTime = new Date(`1970-01-01T08:00:00`);
      const maxTime = new Date(`1970-01-01T22:00:00`);
      if (startDate >= endDate) {
        return res.status(400).json({ error: "L'heure de début doit être antérieure à l'heure de fin." });
      }
      if (startDate < minTime || endDate > maxTime) {
        return res.status(400).json({ error: "Les heures doivent être entre 08:00 et 22:00." });
      }
    }

    const result = await seanceModel.checkEmplacementAvailability(emplacementId, date, start_time, end_time, excludeSeanceId);

    if (start_time && end_time) {
      res.status(200).json({
        available: result,
        message: result ? "Emplacement disponible" : "Emplacement indisponible",
      });
    } else {
      res.status(200).json(result);
    }
  } catch (err) {
    console.error('Erreur checkEmplacementAvailability:', err);
    res.status(500).json({ error: `Erreur lors de la vérification des créneaux: ${err.message}` });
  }
};

// Get sessions by criteria
export const getSeancesByCriteria = async (req, res) => {
  try {
    const criteria = {
      day: req.query.day,
      month: req.query.month,
      year: req.query.year,
      coachId: req.query.coachId,
      emplacementId: req.query.emplacementId,
      status: req.query.status,
    };
    const rows = await seanceModel.getSeancesByCriteria(criteria);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Aucune séance trouvée." });
    }
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur getSeancesByCriteria:', err);
    res.status(500).json({ error: `Erreur lors de la recherche des séances: ${err.message}` });
  }
};

// Get all sessions with details
export const getAllSeancesWithDetails = async (req, res) => {
  try {
    const rows = await seanceModel.getAllSeancesWithDetails();
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur getAllSeancesWithDetails:', err);
    res.status(500).json({ error: `Erreur lors de la récupération des détails: ${err.message}` });
  }
};

// Get session by ID with details
export const getSeanceByIdWithDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "ID de séance invalide." });
    }
    const row = await seanceModel.getSeanceByIdWithDetails(id);
    if (!row) return res.status(404).json({ error: "Séance introuvable." });
    res.status(200).json(row);
  } catch (err) {
    console.error('Erreur getSeanceByIdWithDetails:', err);
    res.status(500).json({ error: `Erreur lors de la récupération des détails: ${err.message}` });
  }
};

// Get sessions by adherent with details
export const getSeancesByAdherentWithDetails = async (req, res) => {
  try {
    const { adherentId } = req.params;
    if (isNaN(Number(adherentId))) {
      return res.status(400).json({ error: "ID d'adhérent invalide." });
    }
    const rows = await seanceModel.getSeancesByAdherentWithDetails(adherentId);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur getSeancesByAdherentWithDetails:', err);
    res.status(500).json({ error: `Erreur lors de la récupération des détails: ${err.message}` });
  }
};

// Get session details by session ID
export const getSeanceDetailsBySeanceId = async (req, res) => {
  try {
    const { seanceId } = req.params;
    if (!seanceId || isNaN(Number(seanceId))) {
      return res.status(400).json({ error: "ID de séance invalide." });
    }
    const details = await seanceModel.getSeanceDetailsBySeanceId(seanceId);
    if (!details) {
      return res.status(404).json({ error: "Aucune séance trouvée pour cet ID." });
    }
    res.status(200).json(details);
  } catch (err) {
    console.error('Erreur getSeanceDetailsBySeanceId:', err);
    res.status(500).json({ error: `Erreur lors de la récupération des détails: ${err.message}` });
  }
};

// Check availability of all terrains from 8:00 to 22:00
export const checkAllTerrainsAvailability = async (req, res) => {
  try {
    const { dateSeance, emplacementId } = req.query;

    // Validate dateSeance
    if (!dateSeance || !/^\d{4}-\d{2}-\d{2}$/.test(dateSeance)) {
      return res.status(400).json({ error: "dateSeance requise et doit être au format YYYY-MM-DD." });
    }

    // Validate emplacementId if provided
    let emplacements = await seanceModel.getAllEmplacements();
    if (emplacementId) {
      const parsedEmplacementId = parseInt(emplacementId);
      if (isNaN(parsedEmplacementId)) {
        return res.status(400).json({ error: "emplacementId doit être un nombre valide." });
      }
      emplacements = emplacements.filter(emp => emp.id === parsedEmplacementId);
      if (!emplacements.length) {
        return res.status(404).json({ error: `Aucun terrain trouvé pour emplacementId: ${emplacementId}.` });
      }
    }

    if (!emplacements.length) {
      return res.status(404).json({ error: "Aucun terrain trouvé." });
    }

    const startHour = 8; // 8:00 AM
    const endHour = 22; // 10:00 PM
    const result = [];

    for (const emplacement of emplacements) {
      const slots = [];
      for (let hour = startHour; hour < endHour; hour++) {
        const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
        const endTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;

        const isAvailable = await seanceModel.checkEmplacementAvailability(emplacement.id, dateSeance, startTime, endTime);

        const formattedStart = startTime.slice(0, 5);
        const formattedEnd = endTime.slice(0, 5);

        slots.push({
          slot: `${formattedStart}-${formattedEnd}`,
          status: isAvailable ? "disponible" : "non disponible",
        });
      }
      result.push({
        terrainId: emplacement.id,
        terrainNom: emplacement.nom,
        slots,
      });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error('Erreur checkAllTerrainsAvailability:', err);
    res.status(500).json({ error: `Erreur lors de la vérification des disponibilités: ${err.message}` });
  }
};

// Check availability of all coaches from 8:00 to 22:00
export const checkAllCoachesAvailability = async (req, res) => {
  try {
    const { dateSeance } = req.query;
    if (!dateSeance || !/^\d{4}-\d{2}-\d{2}$/.test(dateSeance)) {
      return res.status(400).json({ error: "dateSeance requise et doit être au format YYYY-MM-DD." });
    }

    const coaches = await seanceModel.getAllCoaches();
    if (!coaches.length) {
      return res.status(404).json({ error: "Aucun coach trouvé." });
    }

    const startHour = 8;
    const endHour = 22; // Updated to 22:00
    const result = [];

    for (const coach of coaches) {
      const slots = [];
      for (let hour = startHour; hour < endHour; hour++) {
        const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
        const endTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;

        const isAvailable = await seanceModel.checkCoachAvailabilityForSlot(coach.id, dateSeance, startTime, endTime);

        const formattedStart = startTime.slice(0, 5);
        const formattedEnd = endTime.slice(0, 5);

        slots.push({
          slot: `${formattedStart}-${formattedEnd}`,
          status: isAvailable ? "disponible" : "non disponible",
        });
      }
      result.push({
        coachId: coach.id,
        coachNom: coach.nom,
        slots,
      });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error('Erreur checkAllCoachesAvailability:', err);
    res.status(500).json({ error: `Erreur lors de la vérification des disponibilités: ${err.message}` });
  }
};

// Get sessions by factureId
export const getSeancesByFactureId = async (req, res) => {
  try {
    const factureId = req.params.factureId;
    if (!factureId || isNaN(Number(factureId))) {
      return res.status(400).json({ error: "ID de facture invalide." });
    }
    const rows = await seanceModel.getSeancesByFactureId(factureId);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur getSeancesByFactureId:', err);
    res.status(500).json({ error: `Erreur lors de la récupération des séances: ${err.message}` });
  }
};