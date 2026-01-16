import db from '../config/db.js';

const Abonnement = {

  getAbonnementWithAdherents: async (abonnementId) => {
    try {
      const abonnementQuery = `
        SELECT 
          a.*,
          ad.nom as adherent_nom,
          ad.prenom as adherent_prenom,
          ad.email as adherent_email,
          ad.phone as adherent_phone
        FROM abnmts a
        LEFT JOIN adherents ad ON a.adherent_id = ad.id
        WHERE a.id = ?
      `;
      
      const [abonnement] = await db.execute(abonnementQuery, [abonnementId]);
      
      if (abonnement.length === 0) {
        return null;
      }
      
      const adherentsQuery = `
        SELECT 
          p.adherent_id,
          p.ecole_id,
          p.group_id,
          p.date_pack,
          ad.nom,
          ad.prenom,
          ad.email,
          ad.phone,
          ad.role,
          e.nom as ecole_nom,
          g.nom as groupe_nom,
          g.description as groupe_description
        FROM pack p
        INNER JOIN adherents ad ON p.adherent_id = ad.id
        LEFT JOIN ecoles e ON p.ecole_id = e.id
        LEFT JOIN \`groups\` g ON p.group_id = g.id
        WHERE p.abnmts_id = ?
        ORDER BY ad.nom, ad.prenom
      `;
      
      const [adherents] = await db.execute(adherentsQuery, [abonnementId]);
      
      const groupAdherentQuery = `
        SELECT 
          ga.adherent_id,
          ga.group_id,
          ga.cours_id,
          ga.date_abonnement,
          ga.abnmts_id
        FROM group_adherent ga
        WHERE ga.abnmts_id = ?
      `;
      
      const [groupAdherents] = await db.execute(groupAdherentQuery, [abonnementId]);
      
      return {
        abonnement: abonnement[0],
        adherents: adherents,
        group_adherents: groupAdherents
      };
      
    } catch (error) {
      console.error('Erreur dans getAbonnementWithAdherents:', error);
      throw error;
    }
  },

  addAdherentToPack: async (abonnementId, adherentId, ecoleId, groupeId) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const abonnementQuery = `
        SELECT date_debut, date_fin, cours_id 
        FROM abnmts 
        WHERE id = ?
      `;
      const [abonnement] = await connection.execute(abonnementQuery, [abonnementId]);
      
      if (abonnement.length === 0) {
        throw new Error('Abonnement non trouvé');
      }
      
      const { date_debut, date_fin, cours_id } = abonnement[0];
      
      // CORRECTION : Ajouter 1 jour à la date_debut et date_fin
      const addOneDay = (dateString) => {
        const date = new Date(dateString);
        date.setDate(date.getDate() + 1); // Ajouter 1 jour
        return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
      };
      
      const dateDebutFormatted = addOneDay(date_debut);
      const dateFinFormatted = addOneDay(date_fin);
      const datePack = dateDebutFormatted; // date_pack = date_debut + 1 jour
      const dateAbonnement = `${dateDebutFormatted} - ${dateFinFormatted}`; // date_abonnement = "(date_debut+1) - (date_fin+1)"
      
      const checkQuery = `
        SELECT * FROM pack 
        WHERE abnmts_id = ? AND adherent_id = ?
      `;
      const [existing] = await connection.execute(checkQuery, [abonnementId, adherentId]);
      
      if (existing.length > 0) {
        throw new Error('Cet adhérent est déjà associé à cet abonnement');
      }
      
      // CORRECTION : date_pack = date_debut + 1 jour (pour table pack)
      const insertPackQuery = `
        INSERT INTO pack (adherent_id, abnmts_id, date_pack, ecole_id, group_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      
      const [packResult] = await connection.execute(insertPackQuery, [
        adherentId, abonnementId, datePack, ecoleId, groupeId
      ]);
      
      // CORRECTION : date_abonnement = "(date_debut+1) - (date_fin+1)" (pour table group_adherent)
      const groupAdherentQuery = `
        INSERT INTO group_adherent (group_id, adherent_id, cours_id, date_abonnement, abnmts_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          group_id = VALUES(group_id),
          date_abonnement = VALUES(date_abonnement),
          abnmts_id = VALUES(abnmts_id)
      `;
      
      await connection.execute(groupAdherentQuery, [
        groupeId, adherentId, cours_id, dateAbonnement, abonnementId
      ]);
      
      await connection.commit();
      
      return {
        pack_id: packResult.insertId,
        adherent_id: adherentId,
        ecole_id: ecoleId,
        group_id: groupeId,
        date_pack: datePack,
        date_abonnement: dateAbonnement
      };
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  removeAdherentFromPack: async (abonnementId, adherentId) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const deletePackQuery = `
        DELETE FROM pack 
        WHERE abnmts_id = ? AND adherent_id = ?
      `;
      
      const [packResult] = await connection.execute(deletePackQuery, [abonnementId, adherentId]);
      
      const deleteGroupAdherentQuery = `
        DELETE FROM group_adherent 
        WHERE abnmts_id = ? AND adherent_id = ?
      `;
      
      await connection.execute(deleteGroupAdherentQuery, [abonnementId, adherentId]);
      
      await connection.commit();
      
      return packResult;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  updatePackAdherents: async (abonnementId, adherents) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const abonnementQuery = `
        SELECT date_debut, date_fin, cours_id 
        FROM abnmts 
        WHERE id = ?
      `;
      const [abonnement] = await connection.execute(abonnementQuery, [abonnementId]);
      
      if (abonnement.length === 0) {
        throw new Error('Abonnement non trouvé');
      }
      
      const { date_debut, date_fin, cours_id } = abonnement[0];
      
      // CORRECTION : Ajouter 1 jour à la date_debut et date_fin
      const addOneDay = (dateString) => {
        const date = new Date(dateString);
        date.setDate(date.getDate() + 1); // Ajouter 1 jour
        return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
      };
      
      const dateDebutFormatted = addOneDay(date_debut);
      const dateFinFormatted = addOneDay(date_fin);
      const datePack = dateDebutFormatted; // date_pack = date_debut + 1 jour (pour table pack)
      const dateAbonnement = `${dateDebutFormatted} - ${dateFinFormatted}`; // date_abonnement = "(date_debut+1) - (date_fin+1)" (pour table group_adherent)
      
      await connection.execute('DELETE FROM pack WHERE abnmts_id = ?', [abonnementId]);
      await connection.execute('DELETE FROM group_adherent WHERE abnmts_id = ?', [abonnementId]);
      
      const results = [];
      
      for (const adherent of adherents) {
        const { adherent_id, ecole_id, groupe_id } = adherent; // CORRECTION : groupe_id au lieu de group_id
        
        // CORRECTION : date_pack = date_debut + 1 jour (pour table pack)
        const insertPackQuery = `
          INSERT INTO pack (adherent_id, abnmts_id, date_pack, ecole_id, group_id, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `;
        
        const [packResult] = await connection.execute(insertPackQuery, [
          adherent_id, abonnementId, datePack, ecole_id, groupe_id // CORRECTION : groupe_id
        ]);
        
        // CORRECTION : date_abonnement = "(date_debut+1) - (date_fin+1)" (pour table group_adherent)
        const groupAdherentQuery = `
          INSERT INTO group_adherent (group_id, adherent_id, cours_id, date_abonnement, abnmts_id, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `;
        
        await connection.execute(groupAdherentQuery, [
          groupe_id, adherent_id, cours_id, dateAbonnement, abonnementId // CORRECTION : groupe_id
        ]);
        
        results.push({
          adherent_id,
          ecole_id,
          group_id: groupe_id, // CORRECTION : groupe_id
          pack_id: packResult.insertId,
          date_pack: datePack,
          date_abonnement: dateAbonnement
        });
      }
      
      await connection.commit();
      
      return results;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  getAbonnementById: async (id) => {
    try {
      const query = `
        SELECT 
          abn.*,
          ad.nom as adherent_nom,
          ad.prenom as adherent_prenom,
          ad.email as adherent_email,
          ad.phone as adherent_phone,
          c.nom as cours_nom,
          g.nom as groupe_nom,
          g.description as groupe_description,
          e.nom as ecole_nom,
          (abn.prix_ttc - COALESCE(abn.avance_paiement, 0)) as reste_a_payer,
          CASE 
            WHEN abn.avance_paiement >= abn.prix_ttc THEN 'Payé'
            WHEN abn.avance_paiement > 0 THEN 'Acompte'
            ELSE 'Impayé'
          END as statut_paiement,
          DATEDIFF(abn.date_fin, CURDATE()) as jours_restants
        FROM abnmts abn
        LEFT JOIN adherents ad ON abn.adherent_id = ad.id
        LEFT JOIN \`groups\` g ON abn.groupe_id = g.id
        LEFT JOIN ecoles e ON g.ecole_id = e.id
        LEFT JOIN ecoles c ON abn.cours_id = c.id
        WHERE abn.id = ?
      `;
      
      const [rows] = await db.query(query, [id]);
      return rows[0] || null; // Retourne le premier résultat ou null
    } catch (error) {
      console.error('Erreur dans getAbonnementById:', error);
      throw new Error('Erreur lors de la récupération de l\'abonnement');
    }
  },

  getAbonnementsNearExpiry: async (days = 10) => {
    try {
      const query = `
        SELECT 
          abn.*,
          ad.nom as adherent_nom,
          ad.prenom as adherent_prenom,
          ad.email as adherent_email,
          c.nom as cours_nom,
          g.nom as groupe_nom,
          g.description as groupe_description,
          e.nom as ecole_nom,
          (abn.prix_ttc - COALESCE(abn.avance_paiement, 0)) as reste_a_payer,
          CASE 
            WHEN abn.avance_paiement >= abn.prix_ttc THEN 'Payé'
            WHEN abn.avance_paiement > 0 THEN 'Acompte'
            ELSE 'Impayé'
          END as statut_paiement,
          DATEDIFF(abn.date_fin, CURDATE()) as jours_restants
        FROM abnmts abn
        LEFT JOIN adherents ad ON abn.adherent_id = ad.id
        LEFT JOIN \`groups\` g ON abn.groupe_id = g.id
        LEFT JOIN ecoles e ON g.ecole_id = e.id
        LEFT JOIN ecoles c ON abn.cours_id = c.id
        WHERE abn.date_fin BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
          AND DATEDIFF(abn.date_fin, CURDATE()) >= 0
        ORDER BY abn.date_fin ASC, jours_restants ASC
      `;
      
      const [rows] = await db.query(query, [days]);
      return rows;
    } catch (error) {
      console.error('Erreur dans getAbonnementsNearExpiry:', error);
      throw new Error('Erreur lors de la récupération des abonnements proches de l\'expiration');
    }
  },

  getById: async (id) => {
        try {
            const [rows] = await db.query(`
                SELECT 
                    a.*,
                    g.nom as groupe_nom,
                    g.description as groupe_description,
                    e.nom as ecole_nom,
                    (a.prix_ttc - COALESCE(a.avance_paiement, 0)) as reste_a_payer,
                    CASE 
                        WHEN a.avance_paiement >= a.prix_ttc THEN 'Payé'
                        WHEN a.avance_paiement > 0 THEN 'Acompte'
                        ELSE 'Impayé'
                    END as statut_paiement
                FROM abnmts a
                LEFT JOIN \`groups\` g ON a.groupe_id = g.id
                LEFT JOIN ecoles e ON g.ecole_id = e.id
                WHERE a.id = ?
            `, [id]);
            
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Erreur dans Abonnement.getById:', error);
            throw error;
        }
  },

  // Modifier la méthode create pour gérer les packs avec le même abnmts_id
  create: async (adherent_ids, cours_id, groupe_id, date_debut, date_fin, 
              durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, 
              remise, type_paiement, avance_paiement, banque, numero_compte, 
              details_paiement, pack_categorie_id = null) => {
    const conn = await db.getConnection();
    
    try {
        await conn.beginTransaction();

        let abonnementId = null;
        const datePack = new Date().toISOString().split('T')[0];

        if (pack_categorie_id) {
            // Pour les packs: créer UN seul abonnement
            const [result] = await conn.execute(
                `INSERT INTO abnmts 
                    (adherent_id, cours_id, groupe_id, date_debut, date_fin, 
                     durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, remise, 
                     type_paiement, avance_paiement, banque, numero_compte, details_paiement, 
                     pack_categorie_id, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [adherent_ids[0], cours_id, groupe_id, date_debut, date_fin, 
                 durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, remise,
                 type_paiement, avance_paiement, banque, numero_compte, details_paiement, pack_categorie_id]
            );

            abonnementId = result.insertId;

            // Créer une entrée pack pour chaque adhérent avec le MÊME abnmts_id
            for (const adherent_id of adherent_ids) {
                await conn.execute(
                    'INSERT INTO pack (adherent_id, abnmts_id, date_pack) VALUES (?, ?, ?)',
                    [adherent_id, abonnementId, datePack]
                );

                // Gérer l'association groupe-adhérent
                if (groupe_id) {
                    await conn.execute(
                        'INSERT INTO group_adherent (group_id, adherent_id, cours_id, date_abonnement) VALUES (?, ?, ?, ?)',
                        [groupe_id, adherent_id, cours_id, `${date_debut} - ${date_fin}`]
                    );
                }
            }
        } else {
            // Pour les abonnements normaux: créer un abonnement par adhérent
            const abonnementIds = [];
            for (const adherent_id of adherent_ids) {
                const [result] = await conn.execute(
                    `INSERT INTO abnmts 
                        (adherent_id, cours_id, groupe_id, date_debut, date_fin, 
                         durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, remise, 
                         type_paiement, avance_paiement, banque, numero_compte, details_paiement, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [adherent_id, cours_id, groupe_id, date_debut, date_fin, 
                     durer_mois, nombre_activiter, 1, prix_ttc, remise, // nombre_de_personne = 1
                     type_paiement, avance_paiement, banque, numero_compte, details_paiement]
                );

                abonnementIds.push(result.insertId);

                // Gérer l'association groupe-adhérent
                if (groupe_id) {
                    await conn.execute(
                        'INSERT INTO group_adherent (group_id, adherent_id, cours_id, date_abonnement) VALUES (?, ?, ?, ?)',
                        [groupe_id, adherent_id, cours_id, `${date_debut} - ${date_fin}`]
                    );
                }
            }

            abonnementId = abonnementIds;
        }

        await conn.commit();
        conn.release();
        
        return { 
            insertId: abonnementId, 
            packCreated: !!pack_categorie_id 
        };
    } catch (error) {
        await conn.rollback();
        conn.release();
        throw error;
    }
   },

    // Modifier la méthode update
    update: async (id, adherent_id, cours_id, groupe_id, date_debut, date_fin, 
                   durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, remise, 
                   type_paiement, avance_paiement, banque, numero_compte, details_paiement) => {
        const [result] = await db.execute(
            `UPDATE abnmts SET 
                adherent_id = ?, 
                cours_id = ?,
                groupe_id = ?,
                date_debut = ?, 
                date_fin = ?, 
                durer_mois = ?, 
                nombre_activiter = ?,
                nombre_de_personne = ?,
                prix_ttc = ?, 
                remise = ?,
                type_paiement = ?,
                avance_paiement = ?,
                banque = ?,
                numero_compte = ?,
                details_paiement = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [adherent_id, cours_id, groupe_id, date_debut, date_fin, 
             durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, remise,
             type_paiement, avance_paiement, banque, numero_compte, details_paiement, id]
        );
        return result;
    },

    // Exemple pour getAll
    getAll: async () => {
        const [results] = await db.execute(`
            SELECT a.*, g.nom as nom_groupe 
            FROM abnmts a
            LEFT JOIN \`groups\` g ON a.groupe_id = g.id
            ORDER BY a.date_debut DESC
        `);
        return results;
    },

    getLast: async () => {
    const [results] = await db.execute(`
        SELECT a.*, g.nom as nom_groupe 
        FROM abnmts a
        LEFT JOIN \`groups\` g ON a.groupe_id = g.id
        ORDER BY a.id DESC 
        LIMIT 1
    `);
    return results.length > 0 ? results[0] : null;
    },

    // Supprimer un abonnement
    delete: async (id) => {
        const conn = await db.getConnection();
        
        try {
            await conn.beginTransaction();
    
            // D'abord, récupérer les informations de l'abonnement avant suppression
            const [abonnement] = await conn.execute(
                'SELECT adherent_id, groupe_id, cours_id, date_debut, date_fin FROM abnmts WHERE id = ?',
                [id]
            );

            // Supprimer l'abonnement
            const [result] = await conn.execute(
                'DELETE FROM abnmts WHERE id = ?',
                [id]
            );

            
            // Si l'abonnement avait un groupe associé, supprimer aussi l'entrée dans group_adherent
            if (abonnement.length > 0 && abonnement[0].groupe_id) {
                
                await conn.execute(
                    'DELETE FROM group_adherent WHERE abnmts_id = ?',
                    [id]
                );
            }



    
            await conn.commit();
            conn.release();
            
            return result;
        } catch (error) {
            await conn.rollback();
            conn.release();
            throw error;
        }
    },

    // Récupérer les abonnements d'un adhérent
    getByAdherentId: async (adherent_id) => {
        const [results] = await db.execute(`
            SELECT a.*, 
                   c.nom as cours_nom, 
                   g.nom as groupe_nom,
                   g.id as groupe_id
            FROM abnmts a
            JOIN cours c ON a.cours_id = c.id
            LEFT JOIN \`groups\` g ON a.groupe_id = g.id
            WHERE a.adherent_id = ?
            ORDER BY a.date_debut DESC
        `, [adherent_id]);
        return results;
    },

    // Récupérer les abonnements pour un cours
    getByCoursId: async (cours_id) => {
        const [results] = await db.execute(`
            SELECT a.*, 
                   ad.nom as adherent_nom, 
                   ad.prenom as adherent_prenom, 
                   g.nom as groupe_nom,
                   g.id as groupe_id
            FROM abnmts a
            JOIN adherents ad ON a.adherent_id = ad.id
            LEFT JOIN \`groups\` g ON a.groupe_id = g.id
            WHERE a.cours_id = ?
            ORDER BY a.date_debut DESC
        `, [cours_id]);
        return results;
    },

    // Récupérer les abonnements pour un groupe
    getByGroupeId: async (groupe_id) => {
        const [results] = await db.execute(`
            SELECT a.*, 
                   ad.nom as adherent_nom, 
                   ad.prenom as adherent_prenom,
                   c.nom as cours_nom
            FROM abnmts a
            JOIN adherents ad ON a.adherent_id = ad.id
            JOIN cours c ON a.cours_id = c.id
            WHERE a.groupe_id = ?
            ORDER BY a.date_debut DESC
        `, [groupe_id]);
        return results;
    },

    // Récupérer les groupes pour un cours
    getGroupesByCoursId: async (cours_id) => {
        const [results] = await db.execute(`
            SELECT g.id, g.nom, g.description 
            FROM \`groups\` g
            WHERE g.ecole_id = ?
            ORDER BY g.nom ASC
        `, [cours_id]);
        return results;
    },

    // Vérifier si un abonnement existe
    checkExisting: async (adherent_id, cours_id) => {
        const [results] = await db.execute(
            'SELECT id FROM abnmts WHERE adherent_id = ? AND cours_id = ?',
            [adherent_id, cours_id]
        );
        return results.length > 0;
    },

    // Obtenir le nombre total d'abonnements
    getCount: async () => {
        const [results] = await db.execute('SELECT COUNT(*) as total FROM abnmts');
        return results[0].total;
    },

    updatePaiement: async (id, paymentData) => {
        const { type_paiement, montant, banque, numero_compte, details } = paymentData;
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Récupérer l'abonnement actuel avec verrouillage
            const [abonnements] = await connection.execute(
                'SELECT prix_ttc, avance_paiement FROM abnmts WHERE id = ? FOR UPDATE',
                [id]
            );

            if (abonnements.length === 0) {
                throw new Error('Abonnement non trouvé');
            }

            const abonnement = abonnements[0];
            const resteAPayer = parseFloat(abonnement.prix_ttc) - parseFloat(abonnement.avance_paiement);
            const montantNum = parseFloat(montant);

            // Vérifier si le montant dépasse le reste à payer
            if (montantNum > resteAPayer) {
                throw new Error(`Le montant est supérieur au reste à payer (${resteAPayer.toFixed(2)} dt)`);
            }

            // Calculer la nouvelle avance
            const nouvelleAvance = parseFloat(abonnement.avance_paiement) + montantNum;

            // Mettre à jour l'abonnement
            await connection.execute(
                `UPDATE abnmts 
                 SET avance_paiement = ?, 
                     type_paiement = ?, 
                     banque = ?, 
                     numero_compte = ?, 
                     details_paiement = ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [
                    nouvelleAvance,
                    type_paiement,
                    banque || null,
                    numero_compte || null,
                    details || null,
                    id
                ]
            );

            await connection.commit();
            return { 
                success: true,
                nouvelle_avance: nouvelleAvance,
                reste_apayer: parseFloat(abonnement.prix_ttc) - nouvelleAvance
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Méthode pour récupérer les infos de paiement d'un abonnement
    getPaiementInfo: async (id) => {
        try {
            const [abonnements] = await db.execute(
                'SELECT prix_ttc, avance_paiement FROM abnmts WHERE id = ?',
                [id]
            );

            if (abonnements.length === 0) {
                throw new Error('Abonnement non trouvé');
            }

            const abonnement = abonnements[0];
            const resteAPayer = parseFloat(abonnement.prix_ttc) - parseFloat(abonnement.avance_paiement);

            return {
                prix_ttc: parseFloat(abonnement.prix_ttc),
                avance_paiement: parseFloat(abonnement.avance_paiement),
                reste_apayer: resteAPayer
            };
        } catch (error) {
            throw error;
        }
    },
    
    // Récupérer les adhérents distincts avec leurs packs
getAdherentsWithPacks: async (abonnementId) => {
    try {
        const query = `
SELECT 
    p.*,
    a.remise,
    a.prix_ttc,
    a.avance_paiement,
    a.date_debut,
    a.date_fin,
    a.type_paiement as type_paiement_abonnement,
    
    -- Total des versements (somme des montants de details_versements)
    COALESCE(SUM(hv.montant_verse), 0) as total_verse,
    
    -- Calcul du reste à payer: Prix TTC - Total versé
    (a.prix_ttc - COALESCE(SUM(hv.montant_verse), 0)) as reste_a_payer,
    
    -- Détails des versements sous forme d'array d'objets JSON
    CONCAT(
        '[',
        GROUP_CONCAT(
            DISTINCT CONCAT(
                '{"montant":', hv.montant_verse,
                ',"type_paiement":"', COALESCE(hv.type_paiement_verse, 'N/A'),
                '","date_versement":"', DATE_FORMAT(hv.date_versement, '%Y-%m-%d'),
                '"}'
            )
        ),
        ']'
    ) as details_versements,
    
    -- Types de paiement utilisés dans les versements (agrégés)
    GROUP_CONCAT(DISTINCT COALESCE(hv.type_paiement_verse, 'N/A')) as types_paiement_versements,
    
    adh.id as adherent_id,
    adh.nom as adherent_nom,
    adh.prenom as adherent_prenom,
    adh.email as adherent_email,
    adh.phone as adherent_phone,
    adh.assurance as adherent_assurance,
    adh.date_validite_assurance as adherent_date_validite_assurance,
    -- NOUVEAUX CHAMPS POUR LE PAIEMENT D'ASSURANCE
    adh.type_paiement_assurance,
    adh.banque,
    adh.numero_compte,
    adh.details_paiement,
    e.id as ecole_id,
    e.nom as ecole_nom,
    g.id as groupe_id,
    g.nom as groupe_nom,
    g.description as groupe_description
    
FROM pack p
LEFT JOIN abnmts a ON p.abnmts_id = a.id
LEFT JOIN adherents adh ON p.adherent_id = adh.id
LEFT JOIN ecoles e ON p.ecole_id = e.id
LEFT JOIN \`groups\` g ON p.group_id = g.id

-- Jointure avec l'historique des versements
LEFT JOIN historique_versements hv ON a.id = hv.abnmt_id

WHERE p.abnmts_id = ?
GROUP BY 
    p.adherent_id, 
    p.abnmts_id,
    p.date_pack,
    p.ecole_id,
    p.group_id,
    p.created_at,
    p.updated_at,
    a.id, 
    adh.id, 
    e.id, 
    g.id,
    a.prix_ttc,
    a.avance_paiement,
    a.date_debut,
    a.date_fin,
    a.type_paiement,
    -- NOUVEAUX CHAMPS GROUP BY
    adh.type_paiement_assurance,
    adh.banque,
    adh.numero_compte,
    adh.details_paiement

ORDER BY adh.nom, adh.prenom, e.nom, g.nom;
        `;

        const [rows] = await db.execute(query, [abonnementId]);
        return rows;

    } catch (error) {
        console.error('Erreur dans getAdherentsWithPacks:', error);
        throw error;
    }
}

};

export default Abonnement;