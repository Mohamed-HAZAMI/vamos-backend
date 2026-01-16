import {
  createReservation,
  getAllReservations,
  getReservationsWithFactures,
  getReservationById,
  updateReservation,
  getReservationDetails as getReservationDetailsFromModel,
  getFullReservationDetailsById,
  getReservationDetailsByReservationId,
  getReservationsByEmplacementId,
  checkAvailabilityInModel,
  getAllEmplacements,
  updateReservationDate as updateReservationDateInModel,
  getMonthlyReservationTotal,
  getReservationsByFactureId,
} from "../models/reservationModel.js";
import { createFacture } from "../models/factureModel.js";
import pool from "../config/db.js";

// Créer une réservation avec génération automatique d'une facture
export const addReservation = async (req, res) => {
  try {
    const {
      date,
      start_time,
      end_time,
      status,
      adherentId,
      clientName,
      prix,
      emplacementId,
    } = req.body;

    // Validate required fields
    if (!date || !start_time || !end_time || !status || !emplacementId || !prix) {
      return res.status(400).json({ message: "Tous les champs obligatoires doivent être fournis (date, start_time, end_time, status, emplacementId, prix)" });
    }

    // Validate date and time formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({ message: "Format de date ou d'heure invalide" });
    }

    // Validate time order and range (08:00-22:00)
    const startDate = new Date(`1970-01-01T${start_time}`);
    const endDate = new Date(`1970-01-01T${end_time}`);
    const minTime = new Date(`1970-01-01T08:00:00`);
    const maxTime = new Date(`1970-01-01T22:00:00`);
    if (startDate >= endDate) {
      return res.status(400).json({ message: "L'heure de début doit être antérieure à l'heure de fin" });
    }
    if (startDate < minTime || endDate > maxTime) {
      return res.status(400).json({ message: "Les heures doivent être entre 08:00 et 22:00" });
    }

    // Validate prix
    const prixNum = Number(prix);
    if (isNaN(prixNum) || prixNum < 0 || prixNum > 10000) {
      return res.status(400).json({ message: "Prix invalide (doit être entre 0 et 10000)" });
    }

    // Validate emplacementId
    if (isNaN(Number(emplacementId))) {
      return res.status(400).json({ message: "emplacementId invalide" });
    }

    // Check availability
    const isAvailable = await checkAvailabilityInModel(emplacementId, date, start_time, end_time);
    if (!isAvailable) {
      return res.status(400).json({ message: "Emplacement déjà réservé à ce créneau" });
    }

    // Start a transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Create reservation
      const reservation = {
        date,
        start_time,
        end_time,
        status,
        factureId: null,
        adherentId: adherentId || null,
        clientName: clientName || null,
        prix: prixNum,
        emplacementId,
      };

      const reservationId = await createReservation(reservation);

      // Generate invoice details
      const VAT_RATE = 20.0;
      const montant_ht = prixNum;
      const montant_tva = (montant_ht * VAT_RATE) / 100;
      const montant_total = montant_ht + montant_tva;

      const description = `Réservation pour ${clientName || "Client"} le ${date} de ${start_time.slice(0, 5)} à ${end_time.slice(0, 5)}`;
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

      // Generate invoice and get facture_id
      const { facture_id, numero_facture } = await createFacture(invoiceData);

      // Update reservation with facture_id
      await connection.query(
        `UPDATE reservations SET factureId = ? WHERE id = ?`,
        [facture_id, reservationId]
      );

      // Fetch adherent information
      let adherent = null;
      if (adherentId) {
        const [adherentRows] = await connection.query(
          `SELECT id, nom, prenom, CONCAT(nom, ' ', prenom) AS full_name 
           FROM adherents 
           WHERE id = ?`,
          [adherentId]
        );
        adherent = adherentRows[0]
          ? {
              id: adherentRows[0].id,
              nom: adherentRows[0].nom,
              prenom: adherentRows[0].prenom,
              full_name: adherentRows[0].full_name,
            }
          : null;
      }

      await connection.commit();

      res.status(201).json({
        message: "Réservation créée avec succès",
        reservationId,
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
        return res.status(400).json({ message: "Adherent ou emplacement non trouvé" });
      }
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Erreur lors de la création de la réservation:", error.message);
    // res.status(500).json({ message: `Erreur serveur lors de la création de la réservation: ${error.message}` });
  }
};

// Vérifier la disponibilité d’un créneau horaire pour un emplacement donné
export const checkAvailability = async (req, res) => {
  const { emplacementId, dateSeance, start_time, end_time } = req.query;

  try {
    if (!emplacementId || !dateSeance || !start_time || !end_time || 
        isNaN(Number(emplacementId)) || !/^\d{4}-\d{2}-\d{2}$/.test(dateSeance) ||
        !/^\d{2}:\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({ message: "emplacementId, dateSeance, start_time et end_time doivent être valides." });
    }

    // Validate time order and range (08:00-22:00)
    const startDate = new Date(`1970-01-01T${start_time}`);
    const endDate = new Date(`1970-01-01T${end_time}`);
    const minTime = new Date(`1970-01-01T08:00:00`);
    const maxTime = new Date(`1970-01-01T22:00:00`);
    if (startDate >= endDate) {
      return res.status(400).json({ message: "L'heure de début doit être antérieure à l'heure de fin" });
    }
    if (startDate < minTime || endDate > maxTime) {
      return res.status(400).json({ message: "Les heures doivent être entre 08:00 et 22:00" });
    }

    const isAvailable = await checkAvailabilityInModel(emplacementId, dateSeance, start_time, end_time);

    res.status(200).json({
      message: isAvailable ? "Emplacement disponible" : "Emplacement indisponible",
      available: isAvailable,
    });
  } catch (err) {
    console.error('Erreur checkAvailability:', err);
    res.status(500).json({ message: `Erreur lors de la vérification de la disponibilité: ${err.message}` });
  }
};

// Vérifier la disponibilité d'un terrain spécifique pour une date donnée
export const checkTerrainAvailability = async (req, res) => {
  const { emplacementId, dateSeance } = req.query;

  try {
    if (!emplacementId || !dateSeance || isNaN(Number(emplacementId)) || !/^\d{4}-\d{2}-\d{2}$/.test(dateSeance)) {
      return res.status(400).json({ message: "emplacementId et dateSeance doivent être valides." });
    }

    const [emplacementRows] = await pool.query(`SELECT id, nom FROM Emplacements WHERE id = ?`, [emplacementId]);
    if (!emplacementRows.length) {
      return res.status(404).json({ message: "Terrain non trouvé." });
    }

    const startHour = 8; // 8:00 AM
    const endHour = 22; // 10:00 PM
    const slots = [];

    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
      const endTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;

      const isAvailable = await checkAvailabilityInModel(emplacementId, dateSeance, startTime, endTime);

      const formattedStart = startTime.slice(0, 5);
      const formattedEnd = endTime.slice(0, 5);

      slots.push({
        slot: `${formattedStart}-${formattedEnd}`,
        status: isAvailable ? "disponible" : "non disponible",
      });
    }

    res.status(200).json({
      terrainId: emplacementRows[0].id,
      terrainNom: emplacementRows[0].nom,
      slots,
    });
  } catch (err) {
    console.error('Erreur checkTerrainAvailability:', err);
    res.status(500).json({ message: `Erreur lors de la vérification des disponibilités: ${err.message}` });
  }
};

// Vérifier la disponibilité de tous les terrains pour chaque heure de 8h à 22h
export const checkAllTerrainsAvailability = async (req, res) => {
  try {
    const { dateSeance, emplacementId } = req.query;

    // Validate dateSeance
    if (!dateSeance || !/^\d{4}-\d{2}-\d{2}$/.test(dateSeance)) {
      return res.status(400).json({ message: "dateSeance requise et doit être au format YYYY-MM-DD." });
    }

    // Validate emplacementId if provided
    let emplacements = await getAllEmplacements();
    if (emplacementId) {
      const parsedEmplacementId = parseInt(emplacementId);
      if (isNaN(parsedEmplacementId)) {
        return res.status(400).json({ message: "emplacementId doit être un nombre valide." });
      }
      emplacements = emplacements.filter(emp => emp.id === parsedEmplacementId);
      if (!emplacements.length) {
        return res.status(404).json({ message: `Aucun terrain trouvé pour emplacementId: ${emplacementId}.` });
      }
    }

    if (!emplacements.length) {
      return res.status(404).json({ message: "Aucun terrain trouvé." });
    }

    const startHour = 8; // 8:00 AM
    const endHour = 22; // 10:00 PM
    const result = [];

    for (const emplacement of emplacements) {
      const slots = [];

      for (let hour = startHour; hour < endHour; hour++) {
        const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
        const endTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;

        const isAvailable = await checkAvailabilityInModel(emplacement.id, dateSeance, startTime, endTime);

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
    res.status(500).json({ message: `Erreur lors de la vérification des disponibilités: ${err.message}` });
  }
};

// Récupérer toutes les réservations
export const getReservations = async (req, res) => {
  try {
    const reservations = await getAllReservations();
    res.status(200).json(reservations);
  } catch (error) {
    console.error('Erreur getReservations:', error);
    res.status(500).json({ message: `Erreur lors de la récupération des réservations: ${error.message}` });
  }
};

// Récupérer les réservations avec factures
export const getReservationsWithFacture = async (req, res) => {
  try {
    const data = await getReservationsWithFactures();
    res.status(200).json(data);
  } catch (error) {
    console.error('Erreur getReservationsWithFacture:', error);
    res.status(500).json({ message: `Erreur lors de la récupération des réservations avec factures: ${error.message}` });
  }
};

// Récupérer une réservation par ID
export const getReservation = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ message: "ID de réservation invalide" });
    }
    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({ message: "Réservation non trouvée" });
    }
    res.status(200).json(reservation);
  } catch (error) {
    console.error('Erreur getReservation:', error);
    res.status(500).json({ message: `Erreur lors de la récupération de la réservation: ${error.message}` });
  }
};

// Mettre à jour une réservation
export const editReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, start_time, end_time } = req.body;

    if (date && start_time && end_time) {
      const startDate = new Date(`1970-01-01T${start_time}`);
      const endDate = new Date(`1970-01-01T${end_time}`);
      const minTime = new Date(`1970-01-01T08:00:00`);
      const maxTime = new Date(`1970-01-01T22:00:00`);
      if (startDate >= endDate) {
        return res.status(400).json({ message: "L'heure de début doit être antérieure à l'heure de fin" });
      }
      if (startDate < minTime || endDate > maxTime) {
        return res.status(400).json({ message: "Les heures doivent être entre 08:00 et 22:00" });
      }
    }

    if (isNaN(Number(id))) {
      return res.status(400).json({ message: "ID de réservation invalide" });
    }
    await updateReservation(id, req.body);
    res.status(200).json({ message: "Réservation mise à jour" });
  } catch (error) {
    console.error('Erreur editReservation:', error);
    res.status(500).json({ message: `Erreur lors de la mise à jour de la réservation: ${error.message}` });
  }
};

// Mettre à jour uniquement la date d'une réservation
export const updateReservationDate = async (req, res) => {
  try {
    const { date } = req.body;
    const { id } = req.params;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "date requise et doit être au format YYYY-MM-DD" });
    }
    if (isNaN(Number(id))) {
      return res.status(400).json({ message: "ID de réservation invalide" });
    }

    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({ message: "Réservation introuvable" });
    }

    const isAvailable = await checkAvailabilityInModel(
      reservation.emplacementId,
      date,
      reservation.start_time,
      reservation.end_time
    );

    if (!isAvailable) {
      return res.status(400).json({ message: "Emplacement déjà réservé à ce créneau" });
    }

    await updateReservationDateInModel(id, date);
    res.status(200).json({ message: "Date de la réservation mise à jour" });
  } catch (err) {
    console.error('Erreur updateReservationDate:', err);
    res.status(500).json({ message: `Erreur lors de la mise à jour de la date: ${err.message}` });
  }
};

// Supprimer une réservation et sa facture associée
export const removeReservation = async (req, res) => {
  try {
    const reservationId = req.params.id;
    if (isNaN(Number(reservationId))) {
      return res.status(400).json({ message: "ID de réservation invalide" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [reservationRows] = await connection.query(
        `SELECT factureId FROM reservations WHERE id = ?`,
        [reservationId]
      );

      if (reservationRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Réservation introuvable" });
      }

      const factureId = reservationRows[0].factureId;

      const [reservationResult] = await connection.query(
        `DELETE FROM reservations WHERE id = ?`,
        [reservationId]
      );

      if (reservationResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Réservation introuvable" });
      }

      if (factureId) {
        const [factureResult] = await connection.query(
          `DELETE FROM factures WHERE id = ?`,
          [factureId]
        );
        if (factureResult.affectedRows === 0) {
          console.warn(`No invoice found with factureId: ${factureId}`);
        }
      }

      await connection.commit();
      res.status(200).json({ message: "Réservation et facture associée supprimées avec succès" });
    } catch (err) {
      await connection.rollback();
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ message: "Impossible de supprimer la réservation en raison de contraintes de clé étrangère" });
      }
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erreur removeReservation:', error);
    res.status(500).json({ message: `Erreur lors de la suppression de la réservation: ${error.message}` });
  }
};

// Récupérer les détails d'une réservation pour un adhérent
export const getReservationDetails = async (req, res) => {
  try {
    const { adherentId } = req.params;
    if (!adherentId || isNaN(Number(adherentId))) {
      return res.status(400).json({ message: "ID d'adhérent invalide." });
    }

    const details = await getReservationDetailsFromModel(adherentId);
    if (!details.length) {
      return res.status(404).json({ message: "Aucune réservation trouvée pour cet adhérent." });
    }

    res.status(200).json(details);
  } catch (error) {
    console.error('Erreur getReservationDetails:', error);
    res.status(500).json({ message: `Erreur lors de la récupération des détails de réservation: ${error.message}` });
  }
};

// Récupérer tous les détails d'une réservation par ID
export const getFullReservationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ message: "ID de réservation invalide" });
    }
    const details = await getFullReservationDetailsById(id);

    if (!details) {
      return res.status(404).json({ message: "Détails non trouvés pour cette réservation." });
    }

    res.status(200).json(details);
  } catch (error) {
    console.error('Erreur getFullReservationDetails:', error);
    res.status(500).json({ message: `Erreur lors de la récupération des détails complets: ${error.message}` });
  }
};

// Récupérer les détails d'une réservation par reservationId
export const getReservationDetailsById = async (req, res) => {
  try {
    const { reservationId } = req.params;
    if (!reservationId || isNaN(Number(reservationId))) {
      return res.status(400).json({ message: "ID de réservation invalide." });
    }

    const details = await getReservationDetailsByReservationId(reservationId);

    if (!details) {
      return res.status(404).json({ message: "Aucune réservation trouvée pour cet ID." });
    }

    res.status(200).json(details);
  } catch (error) {
    console.error('Erreur getReservationDetailsById:', error);
    res.status(500).json({ message: `Erreur lors de la récupération des détails par ID: ${error.message}` });
  }
};

// Récupérer les réservations par emplacement
export const getReservationsByEmplacement = async (req, res) => {
  try {
    const { emplacementId } = req.params;
    if (!emplacementId || isNaN(Number(emplacementId))) {
      return res.status(400).json({ message: "ID de l'emplacement invalide." });
    }

    const reservations = await getReservationsByEmplacementId(emplacementId);
    res.status(200).json(reservations);
  } catch (error) {
    console.error('Erreur getReservationsByEmplacement:', error);
    res.status(500).json({ message: `Erreur lors de la récupération des réservations par emplacement: ${error.message}` });
  }
};

// Vérifier la disponibilité d'un emplacement
export const checkEmplacementAvailability = async (req, res) => {
  try {
    const { emplacementId, date, start_time, end_time } = req.body;

    if (!emplacementId || !date || !start_time || !end_time || isNaN(Number(emplacementId)) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}:\d{2}$/.test(start_time) ||
        !/^\d{2}:\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({ message: "emplacementId, date, start_time et end_time doivent être valides." });
    }

    // Validate time order and range (08:00-22:00)
    const startDate = new Date(`1970-01-01T${start_time}`);
    const endDate = new Date(`1970-01-01T${end_time}`);
    const minTime = new Date(`1970-01-01T08:00:00`);
    const maxTime = new Date(`1970-01-01T22:00:00`);
    if (startDate >= endDate) {
      return res.status(400).json({ message: "L'heure de début doit être antérieure à l'heure de fin" });
    }
    if (startDate < minTime || endDate > maxTime) {
      return res.status(400).json({ message: "Les heures doivent être entre 08:00 et 22:00" });
    }

    const isAvailable = await checkAvailabilityInModel(emplacementId, date, start_time, end_time);

    res.status(200).json({
      message: isAvailable ? "Emplacement disponible" : "Emplacement indisponible",
      available: isAvailable,
    });
  } catch (error) {
    console.error('Erreur checkEmplacementAvailability:', error);
    res.status(500).json({ message: `Erreur lors de la vérification de la disponibilité: ${error.message}` });
  }
};

// Calculer le total des prix des réservations pour un mois donné
export const getMonthlyReservationTotalController = async (req, res) => {
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

    const result = await getMonthlyReservationTotal(yearNum, monthNum);
    res.status(200).json(result);
  } catch (err) {
    console.error("Erreur getMonthlyReservationTotalController:", err.message);
    res.status(500).json({ message: `Erreur lors du calcul du total mensuel: ${err.message}` });
  }
};

// Récupérer les réservations par factureId
export const getReservationsByFactureIdController = async (req, res) => {
  try {

    const factureId = req.params.factureId;
    if (!factureId || isNaN(Number(factureId))) {
      console.warn(`getReservationsByFactureIdController: Invalid factureId: ${factureId}`);
      return res.status(400).json({ message: "factureId invalide ou manquant" });
    }

    const rows = await getReservationsByFactureId(factureId) || [];

    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur getReservationsByFactureIdController:', err);
    res.status(500).json({ message: `Erreur lors de la récupération des réservations par factureId: ${err.message}` });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Créer une nouvelle réservation
export const addNewReservation = async (req, res) => {
  try {
    const { idEmplacement, terrain, jour, creneau, client } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO reservation (idEmplacement, terrain, jour, creneau, client) VALUES (?, ?, ?, ?, ?)',
      [idEmplacement, terrain, jour, creneau, client]
    );
    
    res.status(201).json({
      id: result.insertId,
      idEmplacement,
      terrain,
      jour,
      creneau,
      client,
      statut: 'réservé'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ce créneau est déjà réservé' });
    }
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer toutes les réservations
export const getAllReservation = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reservation');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Modifier une réservation
export const updateReservationRes = async (req, res) => {
  try {
    const { id } = req.params;
    const { client } = req.body;
    
    const [result] = await pool.execute(
      'UPDATE reservation SET client = ? WHERE id = ?',
      [client, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    
    res.json({ message: 'Réservation mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer une réservation
export const deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      'DELETE FROM reservation WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    
    res.json({ message: 'Réservation annulée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};