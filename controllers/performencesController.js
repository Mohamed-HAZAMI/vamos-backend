import pool from "../config/db.js";

// Fonction pour préparer les valeurs
const prepareValue = (value) => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }
  return value;
};

// Créer une nouvelle performance
export const createPerformance = async (req, res) => {
  try {
    const {
      adherent_id,
      taille,
      poids_kg,
      imc_percent,
      graisse_percent,
      eau_percent,
      muscle_percent,
      os_percent,
      bwr_kcal,
      awr_kcal,
      fr_repos_bpm,
      ta_mmhg,
      spo2_percent,
      date_mesure
    } = req.body;

    // Validation de l'adhérent
    const [adherentCheck] = await pool.execute(
      "SELECT id FROM adherents WHERE id = ? AND archiver = 0",
      [adherent_id]
    );

    if (adherentCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Adhérent non trouvé ou archivé"
      });
    }

    const query = `
      INSERT INTO performences 
      (adherent_id, taille, poids_kg, imc_percent, graisse_percent, eau_percent, 
       muscle_percent, os_percent, bwr_kcal, awr_kcal, fr_repos_bpm, ta_mmhg, 
       spo2_percent, date_mesure)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      adherent_id,
      prepareValue(taille),
      prepareValue(poids_kg),
      prepareValue(imc_percent),
      prepareValue(graisse_percent),
      prepareValue(eau_percent),
      prepareValue(muscle_percent),
      prepareValue(os_percent),
      prepareValue(bwr_kcal),
      prepareValue(awr_kcal),
      prepareValue(fr_repos_bpm),
      prepareValue(ta_mmhg),
      prepareValue(spo2_percent),
      date_mesure || new Date()
    ];

    const [result] = await pool.execute(query, values);
    
    // Récupérer la performance créée avec les infos adhérent
    const [newPerformance] = await pool.execute(
      `SELECT p.*, a.nom, a.prenom 
       FROM performences p 
       LEFT JOIN adherents a ON p.adherent_id = a.id 
       WHERE p.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Performance créée avec succès",
      data: newPerformance[0]
    });
  } catch (error) {
    console.error("Erreur création performance:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur",
      error: error.message 
    });
  }
};

// Récupérer toutes les performances d'un adhérent SANS PAGINATION
export const getPerformancesByAdherent = async (req, res) => {
  try {
    const { adherent_id } = req.params;

    // Vérifier que l'adhérent existe
    const [adherentCheck] = await pool.execute(
      "SELECT id, nom, prenom FROM adherents WHERE id = ? AND archiver = 0",
      [adherent_id]
    );

    if (adherentCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Adhérent non trouvé"
      });
    }

    const adherent = adherentCheck[0];

    // Récupérer TOUTES les données SANS pagination
    const query = `
      SELECT p.*, a.nom, a.prenom 
      FROM performences p
      LEFT JOIN adherents a ON p.adherent_id = a.id
      WHERE p.adherent_id = ?
      ORDER BY p.date_mesure DESC
    `;

    const [performances] = await pool.execute(query, [adherent_id]);

    // Calculer les évolutions
    const performancesWithEvolution = performances.map((perf, index) => {
      const evolution = index < performances.length - 1 ? {
        poids_kg: perf.poids_kg && performances[index + 1].poids_kg 
          ? (perf.poids_kg - performances[index + 1].poids_kg).toFixed(1)
          : null,
        imc_percent: perf.imc_percent && performances[index + 1].imc_percent
          ? (perf.imc_percent - performances[index + 1].imc_percent).toFixed(2)
          : null
      } : { poids_kg: null, imc_percent: null };

      return { ...perf, evolution };
    });

    res.json({
      success: true,
      data: performancesWithEvolution,
      adherent: {
        id: adherent.id,
        nom: adherent.nom,
        prenom: adherent.prenom
      }
      // Pas de pagination dans la réponse
    });
  } catch (error) {
    console.error("Erreur récupération performances:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur",
      error: error.message 
    });
  }
};

// Récupérer la dernière performance d'un adhérent
export const getLatestPerformance = async (req, res) => {
  try {
    const { adherent_id } = req.params;

    const query = `
      SELECT p.* 
      FROM performences p
      WHERE p.adherent_id = ?
      ORDER BY p.date_mesure DESC
      LIMIT 1
    `;

    const [performances] = await pool.execute(query, [adherent_id]);
    
    if (performances.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: "Aucune performance trouvée"
      });
    }

    res.json({
      success: true,
      data: performances[0]
    });
  } catch (error) {
    console.error("Erreur récupération dernière performance:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur",
      error: error.message 
    });
  }
};

// Récupérer toutes les performances (pour admin) SANS PAGINATION
export const getAllPerformances = async (req, res) => {
  try {
    const { adherent_id, search } = req.query;
    
    let whereClause = "WHERE 1=1";
    let params = [];
    
    if (adherent_id) {
      whereClause += " AND p.adherent_id = ?";
      params.push(adherent_id);
    }
    
    if (search) {
      whereClause += " AND (a.nom LIKE ? OR a.prenom LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // Récupérer TOUTES les données SANS pagination
    const query = `
      SELECT p.*, a.nom, a.prenom, a.email, a.phone
      FROM performences p
      LEFT JOIN adherents a ON p.adherent_id = a.id
      ${whereClause}
      ORDER BY p.date_mesure DESC
    `;

    const [performances] = await pool.execute(query, params);

    res.json({
      success: true,
      data: performances
      // Pas de pagination dans la réponse
    });
  } catch (error) {
    console.error("Erreur récupération toutes performances:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur",
      error: error.message 
    });
  }
};

// Récupérer une performance par ID
export const getPerformanceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT p.*, a.nom, a.prenom, a.email, a.phone, a.date_naissance
      FROM performences p
      LEFT JOIN adherents a ON p.adherent_id = a.id
      WHERE p.id = ?
    `;
    
    const [performances] = await pool.execute(query, [id]);
    
    if (performances.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Performance non trouvée"
      });
    }
    
    res.json({
      success: true,
      data: performances[0]
    });
  } catch (error) {
    console.error("Erreur récupération performance:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur",
      error: error.message 
    });
  }
};

// Mettre à jour une performance
export const updatePerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Vérifier que la performance existe
    const [performanceCheck] = await pool.execute(
      "SELECT id, adherent_id FROM performences WHERE id = ?",
      [id]
    );
    
    if (performanceCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Performance non trouvée"
      });
    }

    // Construire dynamiquement la requête UPDATE
    const fields = [];
    const values = [];
    
    // Liste des champs autorisés
    const allowedFields = [
      'taille', 'poids_kg', 'imc_percent', 'graisse_percent', 
      'eau_percent', 'muscle_percent', 'os_percent', 'bwr_kcal', 
      'awr_kcal', 'fr_repos_bpm', 'ta_mmhg', 'spo2_percent', 'date_mesure'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(prepareValue(updates[field]));
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucune donnée valide à mettre à jour"
      });
    }
    
    values.push(id);
    
    const query = `UPDATE performences SET ${fields.join(', ')} WHERE id = ?`;
    
    const [result] = await pool.execute(query, values);
    
    // Récupérer la performance mise à jour
    const [updatedPerformance] = await pool.execute(
      "SELECT * FROM performences WHERE id = ?",
      [id]
    );
    
    res.json({
      success: true,
      message: "Performance mise à jour avec succès",
      data: updatedPerformance[0]
    });
  } catch (error) {
    console.error("Erreur mise à jour performance:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur",
      error: error.message 
    });
  }
};

// Supprimer une performance
export const deletePerformance = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer les infos avant suppression (pour log)
    const [performance] = await pool.execute(
      "SELECT adherent_id FROM performences WHERE id = ?",
      [id]
    );
    
    if (performance.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Performance non trouvée"
      });
    }
    
    const query = "DELETE FROM performences WHERE id = ?";
    const [result] = await pool.execute(query, [id]);
    
    res.json({
      success: true,
      message: "Performance supprimée avec succès",
      deletedAdherentId: performance[0].adherent_id
    });
  } catch (error) {
    console.error("Erreur suppression performance:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur",
      error: error.message 
    });
  }
};

// Statistiques des performances d'un adhérent
export const getPerformanceStats = async (req, res) => {
  try {
    const { adherent_id } = req.params;
    
    const query = `
      SELECT 
        COUNT(*) as total_measurements,
        MIN(date_mesure) as first_measurement,
        MAX(date_mesure) as last_measurement,
        AVG(poids_kg) as avg_weight,
        AVG(imc_percent) as avg_imc,
        AVG(graisse_percent) as avg_fat,
        AVG(muscle_percent) as avg_muscle
      FROM performences 
      WHERE adherent_id = ?
    `;
    
    const [stats] = await pool.execute(query, [adherent_id]);
    
    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error("Erreur statistiques performances:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur",
      error: error.message 
    });
  }
};