import db from '../config/db.js';

// Récupérer le journal par période avec débit/crédit
export const getJournal = async (req, res) => {
  try {
    const { start_date, end_date, period_type = 'day' } = req.query;
    
    // Validation des dates
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'Les dates de début et de fin sont requises' 
      });
    }

    const creditsQuery = `
      SELECT 
        'abonnement' as type,
        CONCAT('Abonnement - ', COALESCE(a.nom, 'Client')) as description,
        a.avance_paiement as credit,
        0 as debit,
        a.avance_paiement as avance,
        COALESCE(CONVERT(a.type_paiement USING utf8mb4), 'espece') as type_paiement,
        a.created_at as date_operation,
        'revenu' as categorie,
        a.prix_ttc as prix_total,
        (a.prix_ttc - a.avance_paiement) as reste_a_payer
      FROM abnmts a
      WHERE a.created_at BETWEEN ? AND ?
        AND a.avance_paiement > 0
      
      UNION ALL
      
      SELECT 
        'reservation' as type,
        CONCAT('Réservation - ', COALESCE(CONVERT(r.client USING utf8mb4), 'Client')) as description,
        r.avance as credit,
        0 as debit,
        r.avance as avance,
        COALESCE(CONVERT(r.type_paiement USING utf8mb4), 'espece') as type_paiement,
        r.created_at as date_operation,
        'revenu' as categorie,
        r.prixTotal as prix_total,
        (r.prixTotal - r.avance) as reste_a_payer
      FROM reservation r
      WHERE r.created_at BETWEEN ? AND ?
        AND r.avance > 0
        AND r.type != 'groupe'

      UNION ALL
      
      -- SECTION POUR LES ASSURANCES
      SELECT 
        'assurance' as type,
        CONCAT('Assurance - ', COALESCE(CONVERT(ad.nom USING utf8mb4), ''), ' ', COALESCE(CONVERT(ad.prenom USING utf8mb4), '')) as description,
        ad.assurance as credit,
        0 as debit,
        ad.assurance as avance,
        'espece' as type_paiement,
        ad.created_at as date_operation,
        'revenu' as categorie,
        ad.assurance as prix_total,
        0 as reste_a_payer
      FROM adherents ad
      WHERE ad.created_at BETWEEN ? AND ?
        AND ad.assurance > 0
        AND ad.assurance IS NOT NULL
    `;

    // Requête pour les DÉBITS (dépenses)
    const debitsQuery = `
      SELECT 
        'depense' as type,
        CONCAT('Dépense - ', COALESCE(CONVERT(d.description USING utf8mb4), 'Dépense divers')) as description,
        0 as credit,
        d.montant as debit,
        0 as avance,
        'espece' as type_paiement,
        d.created_at as date_operation,
        'depense' as categorie,
        0 as prix_total,
        0 as reste_a_payer
      FROM depenses d
      WHERE d.created_at BETWEEN ? AND ?
        AND d.montant > 0
    `;
    
    // Exécuter les requêtes
    const [credits] = await db.execute(creditsQuery, [
      start_date, end_date + ' 23:59:59', 
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59'
    ]);
    
    const [debits] = await db.execute(debitsQuery, [
      start_date, end_date + ' 23:59:59'
    ]);
    
    // Combiner et trier les résultats
    const journal = [...credits, ...debits].sort((a, b) => 
      new Date(a.date_operation) - new Date(b.date_operation)
    );

    // Calculer les totaux AVEC LES ASSURANCES
    const totalCredit = credits.reduce((sum, item) => sum + parseFloat(item.credit || 0), 0);
    const totalDebit = debits.reduce((sum, item) => sum + parseFloat(item.debit || 0), 0);
    const solde = totalCredit - totalDebit;

    // Calculer les totaux par type
    const totalsByType = {
      abonnement: credits.filter(item => item.type === 'abonnement')
                         .reduce((sum, item) => sum + parseFloat(item.credit || 0), 0),
      reservation: credits.filter(item => item.type === 'reservation')
                         .reduce((sum, item) => sum + parseFloat(item.credit || 0), 0),
      assurance: credits.filter(item => item.type === 'assurance')
                       .reduce((sum, item) => sum + parseFloat(item.credit || 0), 0),
      depense: debits.reduce((sum, item) => sum + parseFloat(item.debit || 0), 0)
    };

    // Calculer les totaux des prix totaux et restes à payer
    const totalPrixTotal = credits.reduce((sum, item) => sum + parseFloat(item.prix_total || 0), 0);
    const totalResteAPayer = credits.reduce((sum, item) => sum + parseFloat(item.reste_a_payer || 0), 0);

    res.status(200).json({
      journal,
      totals: {
        total_credit: totalCredit,
        total_debit: totalDebit,
        solde: solde,
        by_type: totalsByType,
        informations: {
          total_prix_total: totalPrixTotal,
          total_reste_a_payer: totalResteAPayer,
          total_avances_percues: totalCredit
        }
      },
      counts: {
        total_operations: journal.length,
        credits_count: credits.length,
        debits_count: debits.length,
        assurances_count: credits.filter(item => item.type === 'assurance').length
      },
      periode: {
        start_date,
        end_date,
        period_type
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du journal:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération du journal',
      error: error.message 
    });
  }
};

// Récupérer le journal groupé par jour/mois/année
export const getJournalGrouped = async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'Les dates de début et de fin sont requises' 
      });
    }

    let dateFormat, groupByField, orderBy;
    
    switch (group_by) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        groupByField = 'DATE(date_operation)';
        orderBy = 'periode DESC';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        groupByField = 'DATE_FORMAT(date_operation, "%Y-%m")';
        orderBy = 'periode DESC';
        break;
      case 'year':
        dateFormat = '%Y';
        groupByField = 'YEAR(date_operation)';
        orderBy = 'periode DESC';
        break;
      default:
        dateFormat = '%Y-%m-%d';
        groupByField = 'DATE(date_operation)';
        orderBy = 'periode DESC';
    }

    const journalQuery = `
      SELECT 
        ${groupByField} as periode,
        DATE_FORMAT(MIN(date_operation), '${dateFormat}') as date_formatted,
        COUNT(*) as nb_operations,
        SUM(credit) as total_credit,
        SUM(debit) as total_debit,
        SUM(credit - debit) as solde_periode,
        SUM(CASE WHEN type = 'abonnement' THEN credit ELSE 0 END) as abonnements_credit,
        SUM(CASE WHEN type = 'reservation' THEN credit ELSE 0 END) as reservations_credit,
        SUM(CASE WHEN type = 'assurance' THEN credit ELSE 0 END) as assurances_credit,
        SUM(CASE WHEN type = 'depense' THEN debit ELSE 0 END) as depenses_debit,
        SUM(prix_total) as total_prix_total,
        SUM(reste_a_payer) as total_reste_a_payer
      FROM (
        SELECT 
          'abonnement' as type,
          COALESCE(a.avance_paiement, 0) as credit,
          0 as debit,
          a.created_at as date_operation,
          COALESCE(a.prix_ttc, 0) as prix_total,
          COALESCE(a.prix_ttc - a.avance_paiement, 0) as reste_a_payer
        FROM abnmts a
        WHERE a.created_at BETWEEN ? AND ?
          AND COALESCE(a.avance_paiement, 0) > 0
        
        UNION ALL
        
        SELECT 
          'reservation' as type,
          COALESCE(r.avance, 0) as credit,
          0 as debit,
          r.created_at as date_operation,
          COALESCE(r.prixTotal, 0) as prix_total,
          COALESCE(r.prixTotal - r.avance, 0) as reste_a_payer
        FROM reservation r
        WHERE r.created_at BETWEEN ? AND ?
          AND COALESCE(r.avance, 0) > 0
          AND r.type != 'groupe'
        
        UNION ALL
        
        SELECT 
          'assurance' as type,
          COALESCE(ad.assurance, 0) as credit,
          0 as debit,
          ad.created_at as date_operation,
          COALESCE(ad.assurance, 0) as prix_total,
          0 as reste_a_payer
        FROM adherents ad
        WHERE ad.created_at BETWEEN ? AND ?
          AND COALESCE(ad.assurance, 0) > 0
          AND ad.assurance IS NOT NULL
        
        UNION ALL
        
        SELECT 
          'depense' as type,
          0 as credit,
          COALESCE(d.montant, 0) as debit,
          d.created_at as date_operation,
          0 as prix_total,
          0 as reste_a_payer
        FROM depenses d
        WHERE d.created_at BETWEEN ? AND ?
          AND COALESCE(d.montant, 0) > 0
      ) as operations
      GROUP BY ${groupByField}
      ORDER BY ${orderBy}
    `;

    const params = [
      start_date, end_date + ' 23:59:59', 
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59'
    ];
    
    const [journalGrouped] = await db.execute(journalQuery, params);

    // Calculer les totaux globaux
    const globalTotals = journalGrouped.reduce((acc, item) => ({
      total_credit: acc.total_credit + parseFloat(item.total_credit || 0),
      total_debit: acc.total_debit + parseFloat(item.total_debit || 0),
      total_operations: acc.total_operations + parseInt(item.nb_operations || 0),
      total_abonnements: acc.total_abonnements + parseFloat(item.abonnements_credit || 0),
      total_reservations: acc.total_reservations + parseFloat(item.reservations_credit || 0),
      total_assurances: acc.total_assurances + parseFloat(item.assurances_credit || 0),
      total_depenses: acc.total_depenses + parseFloat(item.depenses_debit || 0),
      total_prix_total: acc.total_prix_total + parseFloat(item.total_prix_total || 0),
      total_reste_a_payer: acc.total_reste_a_payer + parseFloat(item.total_reste_a_payer || 0)
    }), {
      total_credit: 0,
      total_debit: 0,
      total_operations: 0,
      total_abonnements: 0,
      total_reservations: 0,
      total_assurances: 0,
      total_depenses: 0,
      total_prix_total: 0,
      total_reste_a_payer: 0
    });

    globalTotals.solde_global = globalTotals.total_credit - globalTotals.total_debit;

    res.status(200).json({
      journal_grouped: journalGrouped,
      global_totals: globalTotals,
      group_by: group_by,
      periode: {
        start_date,
        end_date
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du journal groupé:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération du journal groupé',
      error: error.message 
    });
  }
};

// Récupérer les statistiques détaillées par type de paiement
export const getStatsDetails = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'Les dates de début et de fin sont requises' 
      });
    }

    const statsQuery = `
      SELECT 
        type_paiement,
        COUNT(*) as nb_operations,
        SUM(montant) as total_montant,
        'credit' as type_flux,
        'revenu' as categorie
      FROM (
        SELECT 
          COALESCE(CONVERT(type_paiement USING utf8mb4), 'espece') as type_paiement,
          COALESCE(avance_paiement, 0) as montant,
          created_at
        FROM abnmts 
        WHERE created_at BETWEEN ? AND ?
          AND COALESCE(avance_paiement, 0) > 0
        
        UNION ALL
        
        SELECT 
          COALESCE(CONVERT(type_paiement USING utf8mb4), 'espece') as type_paiement,
          COALESCE(avance, 0) as montant,
          created_at
        FROM reservation 
        WHERE created_at BETWEEN ? AND ?
          AND COALESCE(avance, 0) > 0
          AND type != 'groupe'
      ) as revenus
      GROUP BY type_paiement
      
      UNION ALL
      
      SELECT 
        'assurance' as type_paiement,
        COUNT(*) as nb_operations,
        SUM(COALESCE(assurance, 0)) as total_montant,
        'credit' as type_flux,
        'revenu' as categorie
      FROM adherents 
      WHERE created_at BETWEEN ? AND ?
        AND COALESCE(assurance, 0) > 0
        AND assurance IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'depense' as type_paiement,
        COUNT(*) as nb_operations,
        SUM(COALESCE(montant, 0)) as total_montant,
        'debit' as type_flux,
        'depense' as categorie
      FROM depenses 
      WHERE created_at BETWEEN ? AND ?
        AND COALESCE(montant, 0) > 0
      GROUP BY type_paiement
      
      ORDER BY type_flux DESC, total_montant DESC
    `;

    const params = [
      start_date, end_date + ' 23:59:59', 
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59'
    ];
    
    const [stats] = await db.execute(statsQuery, params);

    // Calculer les totaux par flux
    const totalsByFlux = stats.reduce((acc, item) => {
      const flux = item.type_flux;
      if (!acc[flux]) {
        acc[flux] = {
          total_montant: 0,
          nb_operations: 0
        };
      }
      acc[flux].total_montant += parseFloat(item.total_montant || 0);
      acc[flux].nb_operations += parseInt(item.nb_operations || 0);
      return acc;
    }, {});

    res.status(200).json({
      stats_details: stats,
      totals_by_flux: totalsByFlux,
      periode: {
        start_date,
        end_date
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques détaillées:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération des statistiques détaillées',
      error: error.message 
    });
  }
};

// Obtenir un résumé rapide
export const getJournalSummary = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'Les dates de début et de fin sont requises' 
      });
    }

    const summaryQuery = `
      SELECT 
        'abonnements' as type,
        COUNT(*) as count,
        SUM(COALESCE(avance_paiement, 0)) as montant_total,
        'credit' as flux,
        SUM(COALESCE(prix_ttc, 0)) as prix_total,
        SUM(COALESCE(prix_ttc - avance_paiement, 0)) as reste_a_payer
      FROM abnmts 
      WHERE created_at BETWEEN ? AND ?
        AND COALESCE(avance_paiement, 0) > 0
      
      UNION ALL
      
      SELECT 
        'reservations' as type,
        COUNT(*) as count,
        SUM(COALESCE(avance, 0)) as montant_total,
        'credit' as flux,
        SUM(COALESCE(prixTotal, 0)) as prix_total,
        SUM(COALESCE(prixTotal - avance, 0)) as reste_a_payer
      FROM reservation 
      WHERE created_at BETWEEN ? AND ?
        AND COALESCE(avance, 0) > 0
        AND type != 'groupe'
      
      UNION ALL
      
      SELECT 
        'assurances' as type,
        COUNT(*) as count,
        SUM(COALESCE(assurance, 0)) as montant_total,
        'credit' as flux,
        SUM(COALESCE(assurance, 0)) as prix_total,
        0 as reste_a_payer
      FROM adherents 
      WHERE created_at BETWEEN ? AND ?
        AND COALESCE(assurance, 0) > 0
        AND assurance IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'depenses' as type,
        COUNT(*) as count,
        SUM(COALESCE(montant, 0)) as montant_total,
        'debit' as flux,
        0 as prix_total,
        0 as reste_a_payer
      FROM depenses 
      WHERE created_at BETWEEN ? AND ?
        AND COALESCE(montant, 0) > 0
    `;

    const params = [
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59'
    ];

    const [summary] = await db.execute(summaryQuery, params);

    // Calculer les totaux
    const totals = summary.reduce((acc, item) => {
      if (item.flux === 'credit') {
        acc.total_credit += parseFloat(item.montant_total || 0);
        acc.total_credits_count += parseInt(item.count || 0);
        acc.total_prix_total += parseFloat(item.prix_total || 0);
        acc.total_reste_a_payer += parseFloat(item.reste_a_payer || 0);
        
        // Détail par type de revenu
        if (item.type === 'abonnements') {
          acc.abonnements_total = parseFloat(item.montant_total || 0);
          acc.abonnements_count = parseInt(item.count || 0);
        } else if (item.type === 'reservations') {
          acc.reservations_total = parseFloat(item.montant_total || 0);
          acc.reservations_count = parseInt(item.count || 0);
        } else if (item.type === 'assurances') {
          acc.assurances_total = parseFloat(item.montant_total || 0);
          acc.assurances_count = parseInt(item.count || 0);
        }
      } else {
        acc.total_debit += parseFloat(item.montant_total || 0);
        acc.total_debits_count += parseInt(item.count || 0);
        acc.depenses_total = parseFloat(item.montant_total || 0);
        acc.depenses_count = parseInt(item.count || 0);
      }
      return acc;
    }, {
      total_credit: 0,
      total_debit: 0,
      total_credits_count: 0,
      total_debits_count: 0,
      total_prix_total: 0,
      total_reste_a_payer: 0,
      abonnements_total: 0,
      abonnements_count: 0,
      reservations_total: 0,
      reservations_count: 0,
      assurances_total: 0,
      assurances_count: 0,
      depenses_total: 0,
      depenses_count: 0
    });

    totals.solde = totals.total_credit - totals.total_debit;
    totals.total_operations = totals.total_credits_count + totals.total_debits_count;

    res.status(200).json({
      summary,
      totals,
      periode: {
        start_date,
        end_date
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du résumé:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération du résumé',
      error: error.message 
    });
  }
};

// Nouvelle fonction pour obtenir les statistiques des assurances
export const getAssurancesStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'Les dates de début et de fin sont requises' 
      });
    }

    const assurancesQuery = `
      SELECT 
        COUNT(*) as total_adherents,
        SUM(CASE WHEN assurance > 0 AND assurance IS NOT NULL THEN 1 ELSE 0 END) as adherents_avec_assurance,
        SUM(CASE WHEN assurance IS NULL OR assurance = 0 THEN 1 ELSE 0 END) as adherents_sans_assurance,
        SUM(COALESCE(assurance, 0)) as montant_total_assurances,
        AVG(COALESCE(assurance, 0)) as montant_moyen_assurance,
        MIN(created_at) as premiere_date,
        MAX(created_at) as derniere_date
      FROM adherents 
      WHERE created_at BETWEEN ? AND ?
    `;

    const detailsQuery = `
      SELECT 
        id,
        nom,
        prenom,
        email,
        assurance,
        date_validite_assurance,
        created_at,
        role,
        phone
      FROM adherents 
      WHERE created_at BETWEEN ? AND ?
        AND assurance > 0 
        AND assurance IS NOT NULL
      ORDER BY created_at DESC
    `;

    const [stats] = await db.execute(assurancesQuery, [start_date, end_date + ' 23:59:59']);
    const [details] = await db.execute(detailsQuery, [start_date, end_date + ' 23:59:59']);

    const pourcentageAvecAssurance = stats[0].total_adherents > 0 
      ? (stats[0].adherents_avec_assurance / stats[0].total_adherents) * 100 
      : 0;

    res.status(200).json({
      statistiques: {
        ...stats[0],
        pourcentage_avec_assurance: parseFloat(pourcentageAvecAssurance.toFixed(2)),
        pourcentage_sans_assurance: parseFloat((100 - pourcentageAvecAssurance).toFixed(2))
      },
      details_assurances: details,
      periode: {
        start_date,
        end_date
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des assurances:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération des statistiques des assurances',
      error: error.message 
    });
  }
};

// Fonction pour exporter le journal en format CSV
export const exportJournalCSV = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'Les dates de début et de fin sont requises' 
      });
    }

    const journalQuery = `
      SELECT 
        type,
        description,
        credit,
        debit,
        avance,
        type_paiement,
        date_operation,
        categorie,
        prix_total,
        reste_a_payer
      FROM (
        SELECT 
          'abonnement' as type,
          CONCAT('Abonnement - ', COALESCE(a.nom, 'Client')) as description,
          a.avance_paiement as credit,
          0 as debit,
          a.avance_paiement as avance,
          COALESCE(CONVERT(a.type_paiement USING utf8mb4), 'espece') as type_paiement,
          a.created_at as date_operation,
          'revenu' as categorie,
          a.prix_ttc as prix_total,
          (a.prix_ttc - a.avance_paiement) as reste_a_payer
        FROM abnmts a
        WHERE a.created_at BETWEEN ? AND ?
          AND a.avance_paiement > 0
        
        UNION ALL
        
        SELECT 
          'reservation' as type,
          CONCAT('Réservation - ', COALESCE(CONVERT(r.client USING utf8mb4), 'Client')) as description,
          r.avance as credit,
          0 as debit,
          r.avance as avance,
          COALESCE(CONVERT(r.type_paiement USING utf8mb4), 'espece') as type_paiement,
          r.created_at as date_operation,
          'revenu' as categorie,
          r.prixTotal as prix_total,
          (r.prixTotal - r.avance) as reste_a_payer
        FROM reservation r
        WHERE r.created_at BETWEEN ? AND ?
          AND r.avance > 0
          AND r.type != 'groupe'

        UNION ALL
        
        SELECT 
          'assurance' as type,
          CONCAT('Assurance - ', COALESCE(CONVERT(ad.nom USING utf8mb4), ''), ' ', COALESCE(CONVERT(ad.prenom USING utf8mb4), '')) as description,
          ad.assurance as credit,
          0 as debit,
          ad.assurance as avance,
          'espece' as type_paiement,
          ad.created_at as date_operation,
          'revenu' as categorie,
          ad.assurance as prix_total,
          0 as reste_a_payer
        FROM adherents ad
        WHERE ad.created_at BETWEEN ? AND ?
          AND ad.assurance > 0
          AND ad.assurance IS NOT NULL

        UNION ALL
        
        SELECT 
          'depense' as type,
          CONCAT('Dépense - ', COALESCE(CONVERT(d.description USING utf8mb4), 'Dépense divers')) as description,
          0 as credit,
          d.montant as debit,
          0 as avance,
          'espece' as type_paiement,
          d.created_at as date_operation,
          'depense' as categorie,
          0 as prix_total,
          0 as reste_a_payer
        FROM depenses d
        WHERE d.created_at BETWEEN ? AND ?
          AND d.montant > 0
      ) as journal
      ORDER BY date_operation
    `;

    const [journalData] = await db.execute(journalQuery, [
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59',
      start_date, end_date + ' 23:59:59'
    ]);

    // Convertir en CSV
    const headers = ['Type', 'Description', 'Crédit', 'Débit', 'Avance', 'Type Paiement', 'Date Opération', 'Catégorie', 'Prix Total', 'Reste à Payer'];
    const csvRows = [headers.join(',')];
    
    journalData.forEach(row => {
      const rowData = [
        row.type,
        `"${row.description}"`,
        row.credit,
        row.debit,
        row.avance,
        row.type_paiement,
        row.date_operation,
        row.categorie,
        row.prix_total,
        row.reste_a_payer
      ];
      csvRows.push(rowData.join(','));
    });

    const csvString = csvRows.join('\n');
    
    // Définir les en-têtes pour le téléchargement
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=journal_${start_date}_${end_date}.csv`);
    
    res.status(200).send(csvString);

  } catch (error) {
    console.error('Erreur lors de l\'export du journal:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'export du journal',
      error: error.message 
    });
  }
};