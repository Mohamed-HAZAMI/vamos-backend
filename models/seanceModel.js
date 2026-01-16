import pool from "../config/db.js";

// Create a session
export const createSeance = async (data) => {
  const {
    nom = null,
    adherentId = null,
    emplacementId = null,
    coachId = null,
    coursId = null,
    dateSeance = null,
    heureDebut = null,
    heureFin = null,
    prix = null,
    statut = null,
    factureId = null,
  } = data;

  const [result] = await pool.execute(
    `INSERT INTO seances 
       (nom, adherentId, emplacementId, coachId, coursId, dateSeance, heureDebut, heureFin, prix, statut, factureId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nom, adherentId, emplacementId, coachId, coursId, dateSeance, heureDebut, heureFin, prix, statut, factureId]
  );
  return result;
};

// Update a session
export const updateSeance = async (id, data) => {
  const {
    nom = null,
    adherentId = null,
    emplacementId = null,
    coachId = null,
    coursId = null,
    dateSeance = null,
    heureDebut = null,
    heureFin = null,
    prix = null,
    statut = null,
  } = data;

  const [result] = await pool.execute(
    `UPDATE seances
     SET nom = ?, adherentId = ?, emplacementId = ?, coachId = ?, coursId = ?,
         dateSeance = ?, heureDebut = ?, heureFin = ?, prix = ?, statut = ?
     WHERE id = ?`,
    [nom, adherentId, emplacementId, coachId, coursId, dateSeance, heureDebut, heureFin, prix, statut, id]
  );
  return result;
};

// Update only the date of a session
export const updateSeanceDate = async (id, dateSeance) => {
  const [result] = await pool.execute(`UPDATE seances SET dateSeance = ? WHERE id = ?`, [dateSeance, id]);
  return result;
};

// Get all sessions
export const getAllSeances = async () => {
  const [rows] = await pool.execute("SELECT * FROM seances");
  return rows;
};

// Get a session by ID
export const getSeanceById = async (id) => {
  const [rows] = await pool.execute("SELECT * FROM seances WHERE id = ?", [id]);
  return rows[0];
};

// Delete a session
export const deleteSeance = async (id) => {
  const [result] = await pool.execute("DELETE FROM seances WHERE id = ?", [id]);
  return result;
};

// Get sessions by adherent
export const getSeancesByAdherent = async (adherentId) => {
  const [rows] = await pool.execute("SELECT * FROM seances WHERE adherentId = ?", [adherentId]);
  return rows;
};

// Check coach availability
export const checkCoachAvailability = async (coachId, dateSeance, start_time = null, end_time = null, excludeSeanceId = null) => {
  try {
    if (start_time && end_time) {
      const [seances] = await pool.execute(
        `SELECT id, dateSeance, heureDebut, heureFin, statut 
         FROM seances 
         WHERE coachId = ? 
           AND dateSeance = ? 
           AND statut != 'cancelled'
           ${excludeSeanceId ? 'AND id != ?' : ''}
           AND (
             (heureDebut < ? AND heureFin > ?) OR
             (heureDebut < ? AND heureFin > ?) OR
             (heureDebut >= ? AND heureFin <= ?)
           )`,
        excludeSeanceId
          ? [coachId, dateSeance, excludeSeanceId, end_time, start_time, start_time, end_time, start_time, end_time]
          : [coachId, dateSeance, end_time, start_time, start_time, end_time, start_time, end_time]
      );
      return seances.length === 0;
    }

    const startHour = 8;
    const endHour = 22; // Updated to 22:00
    const slots = [];

    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
      const endTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;

      const [seances] = await pool.execute(
        `SELECT id, dateSeance, heureDebut, heureFin, statut 
         FROM seances 
         WHERE coachId = ? 
           AND dateSeance = ? 
           AND statut != 'cancelled'
           ${excludeSeanceId ? 'AND id != ?' : ''}
           AND (
             (heureDebut < ? AND heureFin > ?) OR
             (heureDebut < ? AND heureFin > ?) OR
             (heureDebut >= ? AND heureFin <= ?)
           )`,
        excludeSeanceId
          ? [coachId, dateSeance, excludeSeanceId, endTime, startTime, startTime, endTime, startTime, endTime]
          : [coachId, dateSeance, endTime, startTime, startTime, endTime, startTime, endTime]
      );

      slots.push({
        slot: `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`,
        available: seances.length === 0,
      });
    }

    return slots;
  } catch (error) {
    console.error('Error in checkCoachAvailability:', error);
    throw new Error(`Erreur lors de la vérification de disponibilité du coach: ${error.message}`);
  }
};

// Check emplacement availability
export const checkEmplacementAvailability = async (emplacementId, dateSeance, start_time = null, end_time = null, excludeSeanceId = null) => {
  try {
    if (start_time && end_time) {
      const [seances] = await pool.execute(
        `SELECT id, dateSeance, heureDebut, heureFin, statut 
         FROM seances 
         WHERE emplacementId = ? 
           AND dateSeance = ? 
           AND statut != 'cancelled'
           ${excludeSeanceId ? 'AND id != ?' : ''}
           AND (
             (heureDebut < ? AND heureFin > ?) OR
             (heureDebut < ? AND heureFin > ?) OR
             (heureDebut >= ? AND heureFin <= ?)
           )`,
        excludeSeanceId
          ? [emplacementId, dateSeance, excludeSeanceId, end_time, start_time, start_time, end_time, start_time, end_time]
          : [emplacementId, dateSeance, end_time, start_time, start_time, end_time, start_time, end_time]
      );

      const [reservations] = await pool.execute(
        `SELECT id, date, start_time, end_time, status 
         FROM reservations 
         WHERE emplacementId = ? 
           AND date = ? 
           AND status != 'cancelled'
           AND (
             (start_time < ? AND end_time > ?) OR
             (start_time < ? AND end_time > ?) OR
             (start_time >= ? AND end_time <= ?)
           )`,
        [emplacementId, dateSeance, end_time, start_time, start_time, end_time, start_time, end_time]
      );


      return seances.length === 0 && reservations.length === 0;
    }

    const startHour = 8;
    const endHour = 22; // Updated to 22:00
    const slots = [];

    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
      const endTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;

      const [seances] = await pool.execute(
        `SELECT id, dateSeance, heureDebut, heureFin, statut 
         FROM seances 
         WHERE emplacementId = ? 
           AND dateSeance = ? 
           AND statut != 'cancelled'
           ${excludeSeanceId ? 'AND id != ?' : ''}
           AND (
             (heureDebut < ? AND heureFin > ?) OR
             (heureDebut < ? AND heureFin > ?) OR
             (heureDebut >= ? AND heureFin <= ?)
           )`,
        excludeSeanceId
          ? [emplacementId, dateSeance, excludeSeanceId, endTime, startTime, startTime, endTime, startTime, endTime]
          : [emplacementId, dateSeance, endTime, startTime, startTime, endTime, startTime, endTime]
      );

      const [reservations] = await pool.execute(
        `SELECT id, date, start_time, end_time, status 
         FROM reservations 
         WHERE emplacementId = ? 
           AND date = ? 
           AND status != 'cancelled'
           AND (
             (start_time < ? AND end_time > ?) OR
             (start_time < ? AND end_time > ?) OR
             (start_time >= ? AND end_time <= ?)
           )`,
        [emplacementId, dateSeance, endTime, startTime, startTime, endTime, startTime, endTime]
      );

      slots.push({
        slot: `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`,
        available: seances.length === 0 && reservations.length === 0,
      });
    }

    return slots;
  } catch (error) {
    console.error('Error in checkEmplacementAvailability:', error);
    throw new Error(`Erreur lors de la vérification de disponibilité de l'emplacement: ${error.message}`);
  }
};

// Get sessions by emplacement ID
export const getSeancesByEmplacementId = async (emplacementId) => {
  const [rows] = await pool.execute(
    `SELECT 
      s.id, s.nom, s.dateSeance, s.heureDebut, s.heureFin, s.prix, s.statut,
      c.nom AS cours_nom, co.nom AS coach_nom, e.nom AS emplacement_nom,
      CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
    FROM seances s
    LEFT JOIN cours c ON s.coursId = c.id
    LEFT JOIN coaches co ON s.coachId = co.id
    JOIN emplacements e ON s.emplacementId = e.id
    LEFT JOIN adherents a ON s.adherentId = a.id
    WHERE s.emplacementId = ?`,
    [emplacementId]
  );
  return rows;
};

// Get sessions by criteria
export const getSeancesByCriteria = async (criteria) => {
  let query = "SELECT * FROM seances WHERE 1=1";
  const params = [];

  if (criteria.day) {
    query += ' AND DATE_FORMAT(dateSeance,"%Y-%m-%d") = ?';
    params.push(criteria.day);
  }
  if (criteria.month) {
    query += ' AND DATE_FORMAT(dateSeance,"%Y-%m") = ?';
    params.push(criteria.month);
  }
  if (criteria.year) {
    query += ' AND DATE_FORMAT(dateSeance,"%Y") = ?';
    params.push(criteria.year);
  }
  if (criteria.coachId) {
    query += " AND coachId = ?";
    params.push(criteria.coachId);
  }
  if (criteria.emplacementId) {
    query += " AND emplacementId = ?";
    params.push(criteria.emplacementId);
  }
  if (criteria.status) {
    query += " AND statut = ?";
    params.push(criteria.status);
  }

  const [rows] = await pool.execute(query, params);
  return rows;
};

// Get all sessions with details
export const getAllSeancesWithDetails = async () => {
  const [rows] = await pool.execute(
    `SELECT 
      s.id, s.nom, s.dateSeance, s.heureDebut, s.heureFin, s.prix, s.statut,
      c.nom AS cours_nom, co.nom AS coach_nom, e.nom AS emplacement_nom,
      CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
    FROM seances s
    LEFT JOIN cours c ON s.coursId = c.id
    LEFT JOIN coaches co ON s.coachId = co.id
    JOIN emplacements e ON s.emplacementId = e.id
    LEFT JOIN adherents a ON s.adherentId = a.id`
  );
  return rows;
};

// Get a session by ID with details
export const getSeanceByIdWithDetails = async (id) => {
  const [rows] = await pool.execute(
    `SELECT 
      s.id, s.nom, s.dateSeance, s.heureDebut, s.heureFin, s.prix, s.statut,
      c.nom AS cours_nom, co.nom AS coach_nom, e.nom AS emplacement_nom,
      CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
    FROM seances s
    LEFT JOIN cours c ON s.coursId = c.id
    LEFT JOIN coaches co ON s.coachId = co.id
    JOIN emplacements e ON s.emplacementId = e.id
    LEFT JOIN adherents a ON s.adherentId = a.id
    WHERE s.id = ?`,
    [id]
  );
  return rows[0];
};

// Get sessions by adherent with details
export const getSeancesByAdherentWithDetails = async (adherentId) => {
  const [rows] = await pool.execute(
    `SELECT 
      s.id, s.nom, s.dateSeance, s.heureDebut, s.heureFin, s.prix, s.statut,
      c.nom AS cours_nom, co.nom AS coach_nom, e.nom AS emplacement_nom,
      CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
    FROM seances s
    LEFT JOIN cours c ON s.coursId = c.id
    LEFT JOIN coaches co ON s.coachId = co.id
    JOIN emplacements e ON s.emplacementId = e.id
    LEFT JOIN adherents a ON s.adherentId = a.id
    WHERE s.adherentId = ?`,
    [adherentId]
  );
  return rows;
};

// Get session details by session ID
export const getSeanceDetailsBySeanceId = async (seanceId) => {
  const [rows] = await pool.execute(
    `SELECT 
      s.id, s.nom, s.dateSeance, s.heureDebut, s.heureFin, s.prix, s.statut,
      c.nom AS cours_nom, co.nom AS coach_nom, e.nom AS emplacement_nom,
      CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
    FROM seances s
    LEFT JOIN cours c ON s.coursId = c.id
    LEFT JOIN coaches co ON s.coachId = co.id
    JOIN emplacements e ON s.emplacementId = e.id
    LEFT JOIN adherents a ON s.adherentId = a.id
    WHERE s.id = ?`,
    [seanceId]
  );
  return rows[0];
};

// Get all emplacements
export const getAllEmplacements = async () => {
  const [rows] = await pool.execute("SELECT id, nom FROM emplacements");
  return rows;
};

// Check terrain availability for a specific time slot
export const checkTerrainAvailability = async (emplacementId, dateSeance, startTime, endTime) => {
  try {

    const [seances] = await pool.execute(
      `SELECT id, dateSeance, heureDebut, heureFin, statut 
       FROM seances 
       WHERE emplacementId = ? 
         AND dateSeance = ? 
         AND statut != 'cancelled'
         AND (
           (heureDebut < ? AND heureFin > ?) OR
           (heureDebut < ? AND heureFin > ?) OR
           (heureDebut >= ? AND heureFin <= ?)
         )`,
      [emplacementId, dateSeance, endTime, startTime, startTime, endTime, startTime, endTime]
    );

    const [reservations] = await pool.execute(
      `SELECT id, date, start_time, end_time, status 
       FROM reservations 
       WHERE emplacementId = ? 
         AND date = ? 
         AND status != 'cancelled'
         AND (
           (start_time < ? AND end_time > ?) OR
           (start_time < ? AND end_time > ?) OR
           (start_time >= ? AND end_time <= ?)
         )`,
      [emplacementId, dateSeance, endTime, startTime, startTime, endTime, startTime, endTime]
    );

    return seances.length === 0 && reservations.length === 0;
  } catch (error) {
    console.error('Error in checkTerrainAvailability:', error);
    throw new Error(`Erreur lors de la vérification de disponibilité: ${error.message}`);
  }
};

// Get all coaches
export const getAllCoaches = async () => {
  const [rows] = await pool.execute("SELECT id, nom FROM coaches");
  return rows;
};

// Check coach availability for a specific time slot
export const checkCoachAvailabilityForSlot = async (coachId, dateSeance, startTime, endTime) => {
  try {
    const [seances] = await pool.execute(
      `SELECT id, dateSeance, heureDebut, heureFin, statut 
       FROM seances 
       WHERE coachId = ? 
         AND dateSeance = ? 
         AND statut != 'cancelled'
         AND (
           (heureDebut < ? AND heureFin > ?) OR
           (heureDebut < ? AND heureFin > ?) OR
           (heureDebut >= ? AND heureFin <= ?)
         )`,
      [coachId, dateSeance, endTime, startTime, startTime, endTime, startTime, endTime]
    );
    return seances.length === 0;
  } catch (error) {
    console.error('Error in checkCoachAvailabilityForSlot:', error);
    throw new Error(`Erreur lors de la vérification de disponibilité du coach: ${error.message}`);
  }
};

// Get sessions by factureId
export const getSeancesByFactureId = async (factureId) => {
  const [rows] = await pool.execute(
    `SELECT 
      s.id, s.nom, s.dateSeance, s.heureDebut, s.heureFin, s.prix, s.statut,
      c.nom AS cours_nom, co.nom AS coach_nom, e.nom AS emplacement_nom,
      CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
    FROM seances s
    LEFT JOIN cours c ON s.coursId = c.id
    LEFT JOIN coaches co ON s.coachId = co.id
    JOIN emplacements e ON s.emplacementId = e.id
    LEFT JOIN adherents a ON s.adherentId = a.id
    WHERE s.factureId = ?`,
    [factureId]
  );
  return rows;
};