import pool from "../config/db.js";

// Première fonction pour les réservations
export const getSessionbyIdAdehrent = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false,
        message: "ID adhérent requis"
      });
    }

    const adherentId = parseInt(id);
    if (isNaN(adherentId) || adherentId <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "ID adhérent invalide"
      });
    }

    const query = `
      SELECT 
        r.*
      FROM reservation r
      INNER JOIN reservation_aderent ra ON r.id = ra.reservation_id
      WHERE ra.aderent_id = ?
      ORDER BY r.created_at DESC
    `;

    const [results] = await pool.query(query, [adherentId]);

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (err) {
    console.error("Erreur dans getSessionbyIdAdehrent:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur",
      error: err.message 
    });
  }
};

// Deuxième fonction pour le nombre total de séances
export const getSeanceTotale = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false,
        message: "ID adhérent requis"
      });
    }

    const adherentId = parseInt(id);
    if (isNaN(adherentId) || adherentId <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "ID adhérent invalide"
      });
    }

    // Requête pour le nombre total de séances
    const query = `
      SELECT 
        COALESCE(SUM(pc.nombre_seances), 0) as total_seances,
        COUNT(a.id) as nombre_abonnements,
        -- Ajout des détails par abonnement
        GROUP_CONCAT(
          CONCAT(
            '{"id":', a.id,
            ',"nom_pack":"', COALESCE(pc.nom, 'N/A'),
            '","nombre_seances":', COALESCE(pc.nombre_seances, 0),
            ',"date_debut":"', DATE_FORMAT(a.date_debut, '%Y-%m-%d'),
            '","date_fin":"', DATE_FORMAT(a.date_fin, '%Y-%m-%d'),
            '","prix_ttc":', COALESCE(a.prix_ttc, 0),
            '}'
          ) SEPARATOR ','
        ) as details_abonnements
      FROM abnmts a
      LEFT JOIN pack_categorie pc ON a.pack_categorie_id = pc.id
      WHERE a.adherent_id = ?
      AND a.date_fin >= CURDATE()  -- Abonnements encore valides
    `;

    const [results] = await pool.query(query, [adherentId]);

    // Parser les détails d'abonnements
    let details = [];
    if (results[0].details_abonnements) {
      try {
        details = JSON.parse(`[${results[0].details_abonnements}]`);
      } catch (parseError) {
        console.error("Erreur de parsing JSON:", parseError);
        details = [];
      }
    }

    res.status(200).json({
      success: true,
      data: {
        adherent_id: adherentId,
        total_seances: parseInt(results[0].total_seances) || 0,
        nombre_abonnements: results[0].nombre_abonnements,
        details_abonnements: details
      }
    });

  } catch (err) {
    console.error("Erreur dans getSeanceTotale:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur",
      error: err.message 
    });
  }
};