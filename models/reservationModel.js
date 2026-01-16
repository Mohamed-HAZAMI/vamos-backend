import pool from "../config/db.js";

// Vérifier la disponibilité d'un emplacement pour une date et un créneau horaire
export const checkAvailability = async (emplacementId, date, startTime, endTime) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM reservations 
       WHERE emplacementId = ? 
         AND date = ? 
         AND (
           (start_time < ? AND end_time > ?)
           OR (start_time < ? AND end_time > ?)
           OR (start_time >= ? AND end_time <= ?)
         )`,
      [emplacementId, date, endTime, startTime, startTime, endTime, startTime, endTime]
    );
    return rows.length === 0;
  } catch (error) {
    console.error('Error in checkAvailability:', error);
    throw new Error(`Erreur lors de la vérification de disponibilité: ${error.message}`);
  }
};

// Vérifier la disponibilité (Reservations and Seances)
export const checkAvailabilityInModel = async (emplacementId, date, startTime, endTime) => {
  try {

    // Check Reservations table
    const [reservationRows] = await pool.query(
      `SELECT id, date, start_time, end_time 
       FROM reservations 
       WHERE emplacementId = ? 
         AND date = ? 
         AND (
           (start_time < ? AND end_time > ?)
           OR (start_time < ? AND end_time > ?)
           OR (start_time >= ? AND end_time <= ?)
         )`,
      [emplacementId, date, endTime, startTime, startTime, endTime, startTime, endTime]
    );

    // Check Seances table
    const [seanceRows] = await pool.query(
      `SELECT id, dateSeance, heureDebut, heureFin 
       FROM seances 
       WHERE emplacementId = ? 
         AND dateSeance = ? 
         AND (
           (heureDebut < ? AND heureFin > ?)
           OR (heureDebut < ? AND heureFin > ?)
           OR (heureDebut >= ? AND heureFin <= ?)
         )`,
      [emplacementId, date, endTime, startTime, startTime, endTime, startTime, endTime]
    );

    const isAvailable = reservationRows.length === 0 && seanceRows.length === 0;
    return isAvailable;
  } catch (error) {
    console.error('Error in checkAvailabilityInModel:', error);
    throw new Error(`Erreur lors de la vérification de disponibilité: ${error.message}`);
  }
};

// Vérifier si un emplacement est réservé pour une date donnée (sans créneau horaire)
export const checkEmplacementDateAvailability = async (emplacementId, date) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM reservations
       WHERE emplacementId = ? AND date = ?`,
      [emplacementId, date]
    );
    return rows.length === 0;
  } catch (error) {
    console.error('Error in checkEmplacementDateAvailability:', error);
    throw new Error(`Erreur lors de la vérification de disponibilité par date: ${error.message}`);
  }
};

// Récupérer tous les emplacements (terrains)
export const getAllEmplacements = async () => {
  try {
    const [rows] = await pool.query("SELECT id, nom FROM emplacements");
    return rows;
  } catch (error) {
    console.error('Error in getAllEmplacements:', error);
    throw new Error(`Erreur lors de la récupération des emplacements: ${error.message}`);
  }
};

// Créer une réservation
export const createReservation = async (reservationData) => {
  const {
    date,
    start_time,
    end_time,
    status,
    factureId,
    adherentId,
    clientName,
    prix,
    emplacementId,
  } = reservationData;

  if (!status) {
    throw new Error("Le champ 'status' est obligatoire");
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO reservations 
        (date, start_time, end_time, status, factureId, adherentId, clientName, prix, emplacementId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        date || null,
        start_time || null,
        end_time || null,
        status,
        factureId || null,
        adherentId || null,
        clientName || null,
        prix || null,
        emplacementId || null,
      ]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error in createReservation:', error);
    throw new Error(`Erreur lors de la création de la réservation: ${error.message}`);
  }
};

// Récupérer toutes les réservations
export const getAllReservations = async () => {
  try {
    const [rows] = await pool.query("SELECT * FROM reservations");
    return rows;
  } catch (error) {
    console.error('Error in getAllReservations:', error);
    throw new Error(`Erreur lors de la récupération des réservations: ${error.message}`);
  }
};

// Récupérer les réservations avec factures, adhérents et emplacement
export const getReservationsWithFactures = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        f.montant_total,
        f.date_emission,
        f.date_echeance,
        f.description,
        a.nom   AS adherent_nom,
        a.prenom AS adherent_prenom,
        e.nom   AS emplacement_nom,
        r.clientName,
        r.prix
      FROM reservations r
      LEFT JOIN factures f      ON r.factureId    = f.id
      LEFT JOIN adherents a     ON r.adherentId   = a.id
      LEFT JOIN emplacements e  ON r.emplacementId = e.id
    `);
    return rows;
  } catch (error) {
    console.error('Error in getReservationsWithFactures:', error);
    throw new Error(`Erreur lors de la récupération des réservations avec factures: ${error.message}`);
  }
};

// Récupérer une réservation par ID
export const getReservationById = async (id) => {
  try {
    const [rows] = await pool.query("SELECT * FROM reservations WHERE id = ?", [id]);
    return rows[0];
  } catch (error) {
    console.error('Error in getReservationById:', error);
    throw new Error(`Erreur lors de la récupération de la réservation: ${error.message}`);
  }
};

// Récupérer toutes les réservations pour un emplacement donné (sans données de facture)
export const getReservationsByEmplacementId = async (emplacementId) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        a.nom   AS adherent_nom,
        a.prenom AS adherent_prenom,
        e.nom   AS emplacement_nom,
        r.clientName,
        r.prix
      FROM reservations r
      LEFT JOIN adherents a     ON r.adherentId   = a.id
      LEFT JOIN emplacements e  ON r.emplacementId = e.id
      WHERE r.emplacementId = ?
    `, [emplacementId]);
    return rows;
  } catch (error) {
    console.error('Error in getReservationsByEmplacementId:', error);
    throw new Error(`Erreur lors de la récupération des réservations par emplacement: ${error.message}`);
  }
};

// Mettre à jour une réservation
export const updateReservation = async (id, reservationData) => {
  const {
    date,
    start_time,
    end_time,
    status,
    factureId,
    adherentId,
    clientName,
    prix,
    emplacementId,
  } = reservationData;

  if (!status) {
    throw new Error("Le champ 'status' est obligatoire");
  }

  try {
    await pool.query(
      `UPDATE reservations
       SET date          = ?,
           start_time    = ?,
           end_time      = ?,
           status        = ?,
           factureId     = ?,
           adherentId    = ?,
           clientName    = ?,
           prix          = ?,
           emplacementId = ?
       WHERE id = ?`,
      [
        date || null,
        start_time || null,
        end_time || null,
        status,
        factureId || null,
        adherentId || null,
        clientName || null,
        prix || null,
        emplacementId || null,
        id,
      ]
    );
  } catch (error) {
    console.error('Error in updateReservation:', error);
    throw new Error(`Erreur lors de la mise à jour de la réservation: ${error.message}`);
  }
};

// Mettre à jour uniquement la date d'une réservation
export const updateReservationDate = async (id, date) => {
  try {
    const [result] = await pool.query(
      `UPDATE reservations
       SET date = ?
       WHERE id = ?`,
      [date, id]
    );
    return result;
  } catch (error) {
    console.error('Error in updateReservationDate:', error);
    throw new Error(`Erreur lors de la mise à jour de la date: ${error.message}`);
  }
};

// Supprimer une réservation
export const deleteReservation = async (id) => {
  try {
    await pool.query("DELETE FROM reservations WHERE id = ?", [id]);
  } catch (error) {
    console.error('Error in deleteReservation:', error);
    throw new Error(`Erreur lors de la suppression de la réservation: ${error.message}`);
  }
};

// Récupérer les détails d'une réservation pour un adhérent donné
export const getReservationDetails = async (adherentId) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        f.montant_total,
        f.date_creation,
        f.date_echeance,
        f.statut AS facture_statut,
        r.clientName,
        r.prix,
        e.nom   AS emplacement_nom
      FROM reservations r
      LEFT JOIN factures f      ON r.factureId    = f.id
      LEFT JOIN emplacements e  ON r.emplacementId = e.id
      WHERE r.adherentId = ?
    `, [adherentId]);
    return rows;
  } catch (error) {
    console.error('Error in getReservationDetails:', error);
    throw new Error(`Erreur lors de la récupération des détails de réservation: ${error.message}`);
  }
};

// Récupérer les détails d'une réservation par reservationId
export const getReservationDetailsByReservationId = async (reservationId) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        f.montant_total,
        f.date_creation,
        f.date_echeance,
        f.statut AS facture_statut,
        r.clientName,
        r.prix,
        e.nom   AS emplacement_nom
      FROM reservations r
      LEFT JOIN Factures f      ON r.factureId    = f.id
      LEFT JOIN emplacements e  ON r.emplacementId = e.id
      WHERE r.id = ?
    `, [reservationId]);
    return rows[0];
  } catch (error) {
    console.error('Error in getReservationDetailsByReservationId:', error);
    throw new Error(`Erreur lors de la récupération des détails par ID de réservation: ${error.message}`);
  }
};

// Récupérer tous les détails d'une réservation
export const getFullReservationDetailsById = async (reservationId) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        f.montant_total         AS facture_montant,
        f.date_creation         AS facture_date_creation,
        f.date_echeance         AS facture_date_echeance,
        f.statut                AS facture_statut,
        a.nom                   AS adherent_nom,
        a.prenom                AS adherent_prenom,
        e.nom                   AS emplacement_nom,
        r.clientName,
        r.prix
      FROM reservations r
      LEFT JOIN factures f      ON r.factureId    = f.id
      LEFT JOIN adherents a     ON r.adherentId   = a.id
      LEFT JOIN emplacements e  ON r.emplacementId = e.id
      WHERE r.id = ?
    `, [reservationId]);
    return rows[0];
  } catch (error) {
    console.error('Error in getFullReservationDetailsById:', error);
    throw new Error(`Erreur lors de la récupération des détails complets: ${error.message}`);
  }
};

// Calculer le total des prix des réservations pour un mois donné
export const getMonthlyReservationTotal = async (year, month) => {
  try {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of the month

    const [rows] = await pool.query(`
      SELECT SUM(prix) AS total_price
      FROM reservations
      WHERE date BETWEEN ? AND ?
    `, [startDate, endDate]);

    const total = rows[0].total_price || 0;
    return { year, month, total_price: Number(total) };
  } catch (err) {
    console.error(`Error in getMonthlyReservationTotal for year ${year}, month ${month}:`, err.message);
    throw err;
  }
};

// Récupérer les réservations par factureId
export const getReservationsByFactureId = async (factureId) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        r.*,
        f.montant_total,
        f.date_creation,
        f.date_echeance,
        f.statut AS facture_statut,
        r.clientName,
        r.prix,
        e.nom AS emplacement_nom,
        CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
      FROM reservations r
      LEFT JOIN factures f ON r.factureId = f.id
      LEFT JOIN emplacements e ON r.emplacementId = e.id
      LEFT JOIN adherents a ON r.adherentId = a.id
      WHERE r.factureId = ?`,
      [factureId]
    );
    return rows;
  } catch (error) {
    console.error('Error in getReservationsByFactureId:', error);
    throw new Error(`Erreur lors de la récupération des réservations par factureId: ${error.message}`);
  }
};


// Supprimer un emplacement et ses réservations associées
export const deleteEmplacementModel = async (id) => {
  // Commencer une transaction
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // D'abord supprimer les réservations liées
    const [reservationResult] = await connection.execute(
      'DELETE FROM reservation WHERE idEmplacement = ?',
      [id]
    );

    // Ensuite supprimer l'emplacement
    const [emplacementResult] = await connection.execute(
      'DELETE FROM emplacement WHERE id = ?',
      [id]
    );

    // Valider la transaction
    await connection.commit();
    return emplacementResult;
  } catch (error) {
    // En cas d'erreur, annuler la transaction
    await connection.rollback();
    throw error;
  } finally {
    // Toujours libérer la connexion
    connection.release();
  }
};