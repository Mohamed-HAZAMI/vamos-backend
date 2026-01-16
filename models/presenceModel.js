import pool from "../config/db.js";

class Presence {
  static async getAllPresenceByAdherentId(idAdherent) {
    const [rows] = await pool.query(`
      SELECT 
        ra.reservation_id,
        ra.aderent_id,
        ra.group_id,
        ra.cour_id,
        ra.present,
        ra.created_at as presence_created_at,
        r.jour,
        r.creneau,
        r.terrain,
        r.type,
        r.statut,
        r.client,
        r.telephone,
        r.created_at as reservation_created_at,
        g.nom as group_nom,
        e.nom as ecole_nom,
        a.nom as adherent_nom,
        a.prenom as adherent_prenom,
        a.email as adherent_email
      FROM reservation_aderent ra
      INNER JOIN reservation r ON ra.reservation_id = r.id
      INNER JOIN \`groups\` g ON ra.group_id = g.id
      INNER JOIN ecoles e ON ra.cour_id = e.id
      INNER JOIN adherents a ON ra.aderent_id = a.id
      WHERE ra.aderent_id = ?
      ORDER BY 
        CASE 
          WHEN r.jour LIKE '%/%/2025' THEN STR_TO_DATE(r.jour, '%W %d/%m/%Y')
          ELSE STR_TO_DATE(r.jour, '%W %d/%m/%Y')
        END DESC,
        r.creneau DESC
    `, [idAdherent]);
    
    return rows;
  }

  // Additional method to get presence statistics
  static async getPresenceStatsByAdherentId(idAdherent) {
    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(ra.present) as present_count,
        (COUNT(*) - SUM(ra.present)) as absent_count,
        ROUND((SUM(ra.present) / COUNT(*)) * 100, 2) as presence_rate
      FROM reservation_aderent ra
      INNER JOIN reservation r ON ra.reservation_id = r.id
      WHERE ra.aderent_id = ?
    `, [idAdherent]);
    
    return rows[0];
  }
}

export default Presence;