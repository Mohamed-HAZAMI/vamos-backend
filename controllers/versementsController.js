import pool from "../config/db.js";

// Récupérer tous les versements avec filtrage par période
export const getAllVersements = async (req, res) => {
  try {
    const { startDate, endDate, filterType, month, year } = req.query;
    
    let dateCondition = '';
    const params = [];
    
    // Construire la condition de date selon le filtre
    if (filterType === 'today') {
      dateCondition = 'WHERE DATE(date_versement) = CURDATE()';
    } else if (filterType === 'month' && month && year) {
      dateCondition = 'WHERE YEAR(date_versement) = ? AND MONTH(date_versement) = ?';
      params.push(year, month);
    } else if (filterType === 'year' && year) {
      dateCondition = 'WHERE YEAR(date_versement) = ?';
      params.push(year);
    } else if (filterType === 'custom' && startDate && endDate) {
      dateCondition = 'WHERE date_versement BETWEEN ? AND ?';
      params.push(startDate, endDate + ' 23:59:59');
    }
    
    // Requête pour les versements d'abonnements (historique_versements)
    const queryAbonnements = `
      SELECT 
        'abonnement' as type_versement,
        id,
        abnmt_id as reference_id,
        montant_verse,
        date_versement,
        type_paiement_verse as type_paiement,
        banque,
        numero_compte,
        details_versement
      FROM historique_versements 
      ${dateCondition}
      ORDER BY date_versement DESC
    `;
    
    // Requête pour les versements de réservations (historique_versements_pass)
    const queryReservations = `
      SELECT 
        'reservation' as type_versement,
        id,
        reservation_id as reference_id,
        montant_verse,
        date_versement,
        type_paiement_verse as type_paiement,
        banque,
        numero_compte,
        details_versement
      FROM historique_versements_pass 
      ${dateCondition}
      ORDER BY date_versement DESC
    `;
    
    // Requête pour les statistiques totales par type de paiement
    const queryStats = `
      SELECT 
        type_paiement_verse as type_paiement,
        SUM(montant_verse) as total_montant,
        COUNT(*) as count_versements
      FROM (
        SELECT type_paiement_verse, montant_verse 
        FROM historique_versements 
        ${dateCondition}
        UNION ALL
        SELECT type_paiement_verse, montant_verse 
        FROM historique_versements_pass 
        ${dateCondition}
      ) as combined_versements
      GROUP BY type_paiement_verse
    `;
    
    // Exécuter toutes les requêtes en parallèle
    const [versementsAbonnements] = await pool.execute(queryAbonnements, params);
    const [versementsReservations] = await pool.execute(queryReservations, params);
    const [statsResult] = await pool.execute(queryStats, params);
    
    // Combiner tous les versements
    const allVersements = [
      ...versementsAbonnements,
      ...versementsReservations
    ].sort((a, b) => new Date(b.date_versement) - new Date(a.date_versement));
    
    // Calculer les totaux généraux
    const totalGeneral = allVersements.reduce((sum, v) => sum + parseFloat(v.montant_verse), 0);
    const totalVersements = allVersements.length;
    
    // Formater les statistiques par type de paiement
    const statsParType = {};
    statsResult.forEach(stat => {
      if (stat.type_paiement) {
        statsParType[stat.type_paiement] = {
          total: parseFloat(stat.total_montant) || 0,
          count: parseInt(stat.count_versements) || 0
        };
      }
    });
    
    // Assurer que tous les types de paiement sont présents même s'ils sont à 0
    const typesPaiement = ['espece', 'cheque', 'virement', 'carte'];
    typesPaiement.forEach(type => {
      if (!statsParType[type]) {
        statsParType[type] = {
          total: 0,
          count: 0
        };
      }
    });
    
    res.json({
      success: true,
      data: {
        versements: allVersements,
        statistiques: {
          totalGeneral,
          totalVersements,
          parTypePaiement: statsParType,
          parSource: {
            abonnements: versementsAbonnements.length,
            reservations: versementsReservations.length
          }
        },
        filtres: {
          type: filterType || 'all',
          startDate,
          endDate,
          month,
          year
        }
      }
    });
    
  } catch (err) {
    console.error('Erreur lors de la récupération des versements:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des versements',
      error: err.message
    });
  }
};

// Récupérer uniquement les statistiques de versements (pour l'affichage principal)
export const getVersementsStats = async (req, res) => {
  try {
    const { startDate, endDate, filterType, month, year } = req.query;
    
    let dateCondition = '';
    const params = [];
    
    // Construire la condition de date selon le filtre
    if (filterType === 'today') {
      dateCondition = 'WHERE DATE(date_versement) = CURDATE()';
    } else if (filterType === 'month' && month && year) {
      dateCondition = 'WHERE YEAR(date_versement) = ? AND MONTH(date_versement) = ?';
      params.push(year, month);
    } else if (filterType === 'year' && year) {
      dateCondition = 'WHERE YEAR(date_versement) = ?';
      params.push(year);
    } else if (filterType === 'custom' && startDate && endDate) {
      dateCondition = 'WHERE date_versement BETWEEN ? AND ?';
      params.push(startDate, endDate + ' 23:59:59');
    }
    
    // Requête optimisée pour les statistiques uniquement
    const queryStats = `
      SELECT 
        type_paiement_verse as type_paiement,
        SUM(montant_verse) as total_montant,
        COUNT(*) as count_versements
      FROM (
        SELECT type_paiement_verse, montant_verse 
        FROM historique_versements 
        ${dateCondition}
        UNION ALL
        SELECT type_paiement_verse, montant_verse 
        FROM historique_versements_pass 
        ${dateCondition}
      ) as combined_versements
      GROUP BY type_paiement_verse
    `;
    
    const [statsResult] = await pool.execute(queryStats, params);
    
    // Formater les résultats
    const stats = {};
    let totalGeneral = 0;
    let totalVersements = 0;
    
    statsResult.forEach(stat => {
      if (stat.type_paiement) {
        const total = parseFloat(stat.total_montant) || 0;
        const count = parseInt(stat.count_versements) || 0;
        
        stats[stat.type_paiement] = {
          total: total,
          count: count
        };
        
        totalGeneral += total;
        totalVersements += count;
      }
    });
    
    // Assurer que tous les types de paiement sont présents
    const typesPaiement = ['espece', 'cheque', 'virement', 'carte'];
    typesPaiement.forEach(type => {
      if (!stats[type]) {
        stats[type] = {
          total: 0,
          count: 0
        };
      }
    });
    
    res.json({
      success: true,
      data: {
        parTypePaiement: stats,
        totalGeneral,
        totalVersements,
        filtres: {
          type: filterType || 'all',
          startDate,
          endDate,
          month,
          year
        }
      }
    });
    
  } catch (err) {
    console.error('Erreur lors de la récupération des statistiques de versements:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
};