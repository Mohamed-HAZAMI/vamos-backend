// controllers/presenceCoachController.js
import pool from "../config/db.js";

// controllers/presenceCoachController.js
export const print = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id as coach_id,
        c.nom,
        c.prenom,
        rc.present,
        r.jour,
        r.creneau,
        g.nom as groupe_nom,
        e.nom as ecole_nom,
        rc.created_at
      FROM reservation_coach rc
      INNER JOIN coaches c ON rc.coach_id = c.id
      INNER JOIN reservation r ON rc.reservation_id = r.id
      INNER JOIN \`groups\` g ON rc.group_id = g.id
      INNER JOIN ecoles e ON g.ecole_id = e.id
      ORDER BY r.jour, c.nom, c.prenom
    `;

    const [results] = await pool.execute(query);

    // Transformer les données en format plus adapté pour l'affichage
    const presenceData = transformPresenceData(results);

    res.json({
      success: true,
      data: presenceData,
      rawData: results
    });

  } catch (err) {
    console.error("Erreur lors de la récupération des présences:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
};

export const getCoachPresenceSummary = async (req, res) => {
  try {
    const { startDate, endDate, month, year } = req.body;

    let query = `
      SELECT 
        c.id as coach_id,
        CONCAT(c.nom, ' ', c.prenom) as coach_name,
        COUNT(rc.present) as total_seances,
        SUM(CASE WHEN rc.present = 1 THEN 1 ELSE 0 END) as seances_present,
        SUM(CASE WHEN rc.present = 0 THEN 1 ELSE 0 END) as seances_abscent,
        DATE(r.jour) as date_seance
      FROM reservation_coach rc
      INNER JOIN coaches c ON rc.coach_id = c.id
      INNER JOIN reservation r ON rc.reservation_id = r.id
      WHERE 1=1
    `;

    const params = [];

    if (startDate && endDate) {
      query += ` AND DATE(r.jour) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    if (month && year) {
      query += ` AND MONTH(r.jour) = ? AND YEAR(r.jour) = ?`;
      params.push(month, year);
    }

    query += ` GROUP BY c.id, DATE(r.jour) ORDER BY c.nom, c.prenom, DATE(r.jour)`;

    const [results] = await pool.execute(query, params);

    res.json({
      success: true,
      data: results
    });

  } catch (err) {
    console.error("Erreur lors de la récupération du résumé:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
};

// Fonction utilitaire pour transformer les données
const transformPresenceData = (rawData) => {
  const coachesMap = new Map();
  const datesSet = new Set();

  rawData.forEach(row => {
    const dateKey = row.jour;
    datesSet.add(dateKey);
    
    if (!coachesMap.has(row.coach_id)) {
      coachesMap.set(row.coach_id, {
        id: row.coach_id,
        nom: row.nom,
        prenom: row.prenom,
        presences: new Map()
      });
    }
    
    const coach = coachesMap.get(row.coach_id);
    coach.presences.set(dateKey, row.present);
  });

  return {
    coaches: Array.from(coachesMap.values()),
    dates: Array.from(datesSet).sort()
  };
};