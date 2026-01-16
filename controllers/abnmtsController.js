import Abonnement from '../models/abnmtsModel.js';
import db from '../config/db.js';


export const getAbonnementDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const abonnementDetails = await Abonnement.getAbonnementWithAdherents(id);
    
    if (!abonnementDetails) {
      return res.status(404).json({ message: 'Abonnement non trouvé' });
    }
    
    res.json(abonnementDetails);
  } catch (error) {
    console.error('Erreur lors de la récupération des détails:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const addAdherentToAbonnement = async (req, res) => {
  try {
    const { id } = req.params;
    const { adherent_id, ecole_id, groupe_id } = req.body;
    
    // Validation des données requises
    if (!adherent_id || !ecole_id || !groupe_id) {
      return res.status(400).json({ 
        message: 'adherent_id, ecole_id et groupe_id sont requis' 
      });
    }
    
    const result = await Abonnement.addAdherentToPack(id, adherent_id, ecole_id, groupe_id);
    
    res.json({ 
      message: 'Adhérent ajouté avec succès à l\'abonnement',
      data: result 
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'adhérent:', error);
    
    if (error.message === 'Abonnement non trouvé') {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message === 'Cet adhérent est déjà associé à cet abonnement') {
      return res.status(409).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const removeAdherentFromAbonnement = async (req, res) => {
  try {
    const { id, adherentId } = req.params;
    
    const result = await Abonnement.removeAdherentFromPack(id, adherentId);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: 'Adhérent non trouvé dans cet abonnement' 
      });
    }
    
    res.json({ message: 'Adhérent supprimé avec succès de l\'abonnement' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'adhérent:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateDateFinAbonnement = async (req, res) => {
    try {
        const { id } = req.params; // ID de l'abonnement
        const { date_fin } = req.body; // Seulement la nouvelle date de fin

        // Validation
        if (!id || !date_fin) {
            return res.status(400).json({
                success: false,
                message: "Paramètres manquants"
            });
        }

        // Vérifier le format de date
        const nouvelleDateFin = new Date(date_fin);
        if (isNaN(nouvelleDateFin.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Date invalide"
            });
        }

        // Vérifier que la date n'est pas dans le passé
        const aujourdHui = new Date();
        aujourdHui.setHours(0, 0, 0, 0);
        nouvelleDateFin.setHours(0, 0, 0, 0);
        
        if (nouvelleDateFin < aujourdHui) {
            return res.status(400).json({
                success: false,
                message: "La date de fin ne peut pas être dans le passé"
            });
        }

        // 1. Récupérer l'abonnement actuel
        const [abonnementRows] = await db.execute(
            'SELECT date_debut FROM abnmts WHERE id = ?',
            [id]
        );

        if (abonnementRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Abonnement non trouvé"
            });
        }

        const dateDebut = new Date(abonnementRows[0].date_debut);

        // 2. Vérifier que la nouvelle date est après la date de début
        if (nouvelleDateFin <= dateDebut) {
            return res.status(400).json({
                success: false,
                message: "La date de fin doit être après la date de début"
            });
        }

        // 3. Mettre à jour la date de fin
        const [result] = await db.execute(
            'UPDATE abnmts SET date_fin = ?, updated_at = NOW() WHERE id = ?',
            [nouvelleDateFin.toISOString().split('T')[0], id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Échec de la mise à jour"
            });
        }

        // 4. Récupérer les données mises à jour
        const [updatedRows] = await db.execute(
            'SELECT id, adherent_id, date_debut, date_fin FROM abnmts WHERE id = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            message: "Date de fin mise à jour avec succès",
            data: updatedRows[0]
        });

    } catch (error) {
        console.error("Erreur:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur"
        });
    }
};

// controllers/abnmtsController.js - Fonction updateAbonnementPackCategorie
export const updateAbonnementPackCategorie = async (req, res) => {
  try {
    const { id } = req.params;
    const { pack_categorie_id, prix_ttc, durer_mois, nombre_activiter, nombre_de_personne } = req.body;

    // Validation
    if (pack_categorie_id === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Le pack_categorie_id est requis'
      });
    }

    // Vérifier si l'abonnement existe
    const checkQuery = 'SELECT * FROM abnmts WHERE id = ?';
    const [abonnements] = await db.execute(checkQuery, [id]);
    
    if (abonnements.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement non trouvé'
      });
    }

    // Mettre à jour le pack_categorie_id et les autres champs
    const updateQuery = `
      UPDATE abnmts 
      SET pack_categorie_id = ?, 
          prix_ttc = ?,
          durer_mois = ?,
          nombre_activiter = ?,
          nombre_de_personne = ?,
          updated_at = NOW() 
      WHERE id = ?
    `;
    
    await db.execute(updateQuery, [
      pack_categorie_id, 
      prix_ttc || abonnements[0].prix_ttc,
      durer_mois || abonnements[0].durer_mois,
      nombre_activiter || abonnements[0].nombre_activiter,
      nombre_de_personne || abonnements[0].nombre_de_personne,
      id
    ]);

    res.json({
      success: true,
      message: 'Pack catégorie et prix mis à jour avec succès',
      data: {
        id: parseInt(id),
        pack_categorie_id: pack_categorie_id,
        prix_ttc: prix_ttc || abonnements[0].prix_ttc,
        durer_mois: durer_mois || abonnements[0].durer_mois,
        nombre_activiter: nombre_activiter || abonnements[0].nombre_activiter,
        nombre_de_personne: nombre_de_personne || abonnements[0].nombre_de_personne
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du pack catégorie:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du pack catégorie',
      error: error.message
    });
  }
};

export const updateAbonnementAdherents = async (req, res) => {
  try {
    const { id } = req.params;
    const { adherents } = req.body;
    
    if (!Array.isArray(adherents)) {
      return res.status(400).json({ 
        message: 'Le champ adherents doit être un tableau' 
      });
    }
    
    // Validation que chaque adhérent a les champs requis
    for (const adherent of adherents) {
      if (!adherent.adherent_id || !adherent.ecole_id || !adherent.groupe_id) {
        return res.status(400).json({ 
          message: 'Chaque adhérent doit avoir adherent_id, ecole_id et groupe_id' 
        });
      }
    }
    
    const result = await Abonnement.updatePackAdherents(id, adherents);
    
    res.json({ 
      message: 'Adhérents mis à jour avec succès',
      data: result 
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des adhérents:', error);
    
    if (error.message === 'Abonnement non trouvé') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


export const getAllAbonnementsNearExpiry = async (req, res) => {
  try {
    const { days = 10 } = req.query;
    const abonnements = await Abonnement.getAbonnementsNearExpiry(parseInt(days));
    
    res.status(200).json({
      success: true,
      data: abonnements,
      count: abonnements.length
    });
  } catch (error) {
    console.error('Erreur dans getAllAbonnementsNearExpiry:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des abonnements',
      error: error.message
    });
  }
};

// controllers/abnmtsController.js
export const updateAbonnement = async (req, res) => {
    const conn = await db.getConnection();
    
    try {
        const { 
            type_paiement, 
            avance_paiement, 
            banque, 
            numero_compte, 
            details_paiement
        } = req.body;
        
        // Validation spécifique pour virement
        if (type_paiement === 'virement' && (!banque || !numero_compte)) {
            return res.status(400).json({
                success: false,
                message: 'Pour un virement, la banque et le numéro de compte sont obligatoires'
            });
        }

        // Vérifier l'abonnement existant
        const [existingAbonnement] = await conn.execute(
            'SELECT * FROM abnmts WHERE id = ?',
            [req.params.id]
        );

        if (existingAbonnement.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Abonnement non trouvé'
            });
        }

        await conn.beginTransaction();

        // Mettre à jour uniquement les informations de paiement
        await conn.execute(
            `UPDATE abnmts SET 
                type_paiement = ?,
                avance_paiement = ?,
                banque = ?,
                numero_compte = ?,
                details_paiement = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                type_paiement, 
                avance_paiement || 0, 
                banque || null, 
                numero_compte || null, 
                details_paiement || null,
                req.params.id
            ]
        );

        await conn.commit();
        
        res.json({
            success: true,
            message: 'Informations de paiement mises à jour avec succès',
            data: { id: req.params.id }
        });
    } catch (error) {
        await conn.rollback();
        console.error("Error updating abonnement:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        conn.release();
    }
};

// Récupérer les détails d'un pack spécifique avec ses adhérents
export const getPackDetails = async (req, res) => {
  const conn = await db.getConnection();
  
  try {
    const packId = req.params.id;

    // Vérifier si l'abonnement existe et est un pack
    const [abonnement] = await conn.execute(
      `SELECT a.*, pc.nom as pack_nom 
       FROM abnmts a 
       LEFT JOIN pack_categorie pc ON a.pack_categorie_id = pc.id 
       WHERE a.id = ?`,
      [packId]
    );

    if (abonnement.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pack non trouvé'
      });
    }

    const abonnementData = abonnement[0];

    // Si ce n'est pas un pack, retourner une erreur
    if (!abonnementData.pack_categorie_id) {
      return res.status(400).json({
        success: false,
        message: "Cet abonnement n'est pas un pack"
      });
    }

    // Récupérer tous les adhérents associés à ce pack (CORRIGÉ)
    const [packAdherents] = await conn.execute(
      `SELECT 
         p.adherent_id,
         a.nom as adherent_nom,
         a.prenom as adherent_prenom,
         p.ecole_id as cours_id,
         e.nom as cours_nom,
         p.group_id as groupe_id,
         g.nom as groupe_nom
       FROM pack p
       LEFT JOIN adherents a ON p.adherent_id = a.id
       LEFT JOIN ecoles e ON p.ecole_id = e.id
       LEFT JOIN \`groups\` g ON p.group_id = g.id
       WHERE p.abnmts_id = ?`,
      [packId]
    );

    await conn.commit();
    
    res.json({
      success: true,
      data: {
        pack_info: {
          id: abonnementData.id,
          nom: abonnementData.pack_nom,
          date_debut: abonnementData.date_debut,
          date_fin: abonnementData.date_fin,
          durer_mois: abonnementData.durer_mois,
          nombre_activiter: abonnementData.nombre_activiter,
          nombre_de_personne: abonnementData.nombre_de_personne,
          prix_ttc: abonnementData.prix_ttc,
          remise: abonnementData.remise
        },
        adherents: packAdherents
      }
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error fetching pack details:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
};


// Récupérer un abonnement par ID
export const getAbonnementById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ 
                message: 'ID abonnement requis' 
            });
        }

        const abonnement = await Abonnement.getAbonnementById(id);
        
        if (!abonnement) {
            return res.status(404).json({ 
                message: 'Abonnement non trouvé' 
            });
        }

        res.status(200).json(abonnement);
    } catch (error) {
        console.error('Erreur dans getAbonnementById:', error);
        res.status(500).json({ 
            message: 'Erreur serveur lors de la récupération de l\'abonnement' 
        });
    }
};

// Modifier createAbonnement pour gérer les packs avec le même abnmts_id
export const createAbonnement = async (req, res) => {
    const conn = await db.getConnection();
    
    try {
        const { 
            adherent_ids, // Array d'IDs d'adhérents
            date_debut, date_fin, 
            durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, remise, 
            type_paiement, avance_paiement, banque, numero_compte, details_paiement,
            pack_categorie_id,
            nom, // Nouveau champ pour le nom sur le paiement
            date_dechiance, // Nouveau champ pour la date d'échéance
            remarque, // NOUVEAU CHAMP: remarque
            adherent_selections // Nouveau format avec tableau d'écoles par adhérent
        } = req.body;
        
        // Validation des champs obligatoires
        if (!adherent_ids || !Array.isArray(adherent_ids) || adherent_ids.length === 0 ||
            !date_debut || !date_fin || !durer_mois || !nombre_activiter || 
            !nombre_de_personne || !prix_ttc || !type_paiement) {
            return res.status(400).json({ 
                success: false,
                message: 'Tous les champs obligatoires doivent être remplis'
            });
        }

        // Validation des champs selon le type de paiement
        // switch (type_paiement) {
        //     case 'cheque':
        //         if (!nom || !date_dechiance) {
        //             return res.status(400).json({
        //                 success: false,
        //                 message: 'Pour un chèque, le nom et la date d\'échéance sont requis'
        //             });
        //         }
        //         break;
        //     case 'carte':
        //     case 'virement':
        //         if (!nom || !numero_compte || !banque) {
        //             return res.status(400).json({
        //                 success: false,
        //                 message: `Pour le ${type_paiement === 'carte' ? 'TPE' : 'virement'}, le nom, le numéro de compte et la banque sont requis`
        //             });
        //         }
        //         break;
        //     default:
        //         // Espèce - pas de validation supplémentaire
        //         break;
        // }

        await conn.beginTransaction();

        let abonnementId = null;
        const datePack = new Date().toISOString().split('T')[0];

        // Convertir la date d'échéance au format MySQL si elle existe
        let formattedDateDechiance = null;
        if (date_dechiance) {
            const date = new Date(date_dechiance);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                formattedDateDechiance = `${year}-${month}-${day}`;
            }
        }

        if (pack_categorie_id) {
            // Pour les packs: créer UN seul abonnement avec multiple adhérents
            const firstAdherentId = adherent_ids[0];
            const firstSelection = adherent_selections[firstAdherentId];
            const firstEcole = firstSelection.ecoles[0];
            
            const [result] = await conn.execute(
                `INSERT INTO abnmts 
                    (adherent_id, cours_id, groupe_id, date_debut, date_fin, 
                     durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, remise, 
                     type_paiement, avance_paiement, banque, numero_compte, details_paiement, 
                     pack_categorie_id, nom, date_dechiance, remarque, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    firstAdherentId, 
                    firstEcole.ecole_id || null, 
                    firstEcole.groupe_id || null, 
                    date_debut, 
                    date_fin, 
                    durer_mois, 
                    nombre_activiter, 
                    nombre_de_personne, 
                    prix_ttc, 
                    remise || 0,
                    type_paiement, 
                    0, // TOUJOURS 0 pour avance_paiement dans abnmts
                    banque || null, 
                    numero_compte || null, 
                    details_paiement || null, 
                    pack_categorie_id,
                    nom || null,
                    formattedDateDechiance,
                    remarque || null, // AJOUT DU CHAMP REMARQUE
                ]
            );

            abonnementId = result.insertId;

            // Créer une entrée dans la table pack pour chaque adhérent avec le MÊME abnmts_id
            for (const adherent_id of adherent_ids) {
                const selection = adherent_selections[adherent_id];
                
                for (const ecole of selection.ecoles) {
                    await conn.execute(
                        'INSERT INTO pack (adherent_id, abnmts_id, date_pack, ecole_id, group_id) VALUES (?, ?, ?, ?, ?)',
                        [adherent_id, abonnementId, datePack, ecole.ecole_id || null, ecole.groupe_id || null]
                    );

                    // Gérer l'association groupe-adhérent pour chaque adhérent et chaque cours
                    if (ecole.groupe_id) {
                        await conn.execute(
                            'INSERT INTO group_adherent (group_id, adherent_id, cours_id, date_abonnement , abnmts_id) VALUES (?, ?, ?, ?, ?)',
                            [ecole.groupe_id, adherent_id, ecole.ecole_id, `${date_debut} - ${date_fin}`, abonnementId]
                        );
                    }
                }
            }
        } else {
            // Pour les abonnements normaux: créer un abonnement par adhérent
            const abonnementIds = [];
            for (const adherent_id of adherent_ids) {
                const selection = adherent_selections[adherent_id];
                const firstEcole = selection.ecoles[0];
                
                const [result] = await conn.execute(
                    `INSERT INTO abnmts 
                        (adherent_id, cours_id, groupe_id, date_debut, date_fin, 
                         durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, remise, 
                         type_paiement, avance_paiement, banque, numero_compte, details_paiement, 
                         nom, date_dechiance, remarque, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [
                        adherent_id, 
                        firstEcole.ecole_id || null, 
                        firstEcole.groupe_id || null, 
                        date_debut, 
                        date_fin, 
                        durer_mois, 
                        nombre_activiter, 
                        1, // nombre_de_personne = 1 pour abonnement individuel
                        prix_ttc, 
                        remise || 0,
                        type_paiement, 
                        0, // TOUJOURS 0 pour avance_paiement dans abnmts
                        banque || null, 
                        numero_compte || null, 
                        details_paiement || null,
                        nom || null,
                        formattedDateDechiance,
                        remarque || null, // AJOUT DU CHAMP REMARQUE
                    ]
                );

                const currentAbonnementId = result.insertId;
                abonnementIds.push(currentAbonnementId);

                // Créer des entrées supplémentaires pour les autres cours (s'il y en a)
                for (let i = 1; i < selection.ecoles.length; i++) {
                    const ecole = selection.ecoles[i];
                    await conn.execute(
                        'INSERT INTO pack (adherent_id, abnmts_id, date_pack, ecole_id, group_id) VALUES (?, ?, ?, ?, ?)',
                        [adherent_id, currentAbonnementId, datePack, ecole.ecole_id || null, ecole.groupe_id || null]
                    );
                }

                // Gérer l'association groupe-adhérent pour tous les cours
                for (const ecole of selection.ecoles) {
                    if (ecole.groupe_id) {
                        await conn.execute(
                            'INSERT INTO group_adherent (group_id, adherent_id, cours_id, date_abonnement) VALUES (?, ?, ?, ?)',
                            [ecole.groupe_id, adherent_id, ecole.ecole_id, `${date_debut} - ${date_fin}`]
                        );
                    }
                }
            }

            abonnementId = abonnementIds;
        }

        // NOUVEAU: Enregistrer l'avance_paiement dans l'historique_versements si il existe
        if (avance_paiement && parseFloat(avance_paiement) > 0) {
            const abonnementIds = Array.isArray(abonnementId) ? abonnementId : [abonnementId];
            
            for (const abnmtId of abonnementIds) {
                // Insérer dans historique_versements
                await conn.execute(
                    `INSERT INTO historique_versements 
                        (abnmt_id, montant_verse, type_paiement_verse, details_versement) 
                     VALUES (?, ?, ?, ?)`,
                    [
                        abnmtId,
                        parseFloat(avance_paiement),
                        type_paiement,
                        "Acompte initial lors de la création de l'abonnement"
                    ]
                );

                // Mettre à jour l'avance_paiement dans la table abnmts avec la somme des versements
                await conn.execute(
                    `UPDATE abnmts 
                     SET avance_paiement = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [parseFloat(avance_paiement), abnmtId]
                );
            }
        }

        await conn.commit();
        
        res.status(201).json({
            success: true,
            data: { 
                id: abonnementId, 
                pack_created: !!pack_categorie_id,
                adherent_count: adherent_ids.length,
                cours_per_adherent: nombre_activiter,
                avance_paiement_enregistre: !!(avance_paiement && parseFloat(avance_paiement) > 0),
                payment_info: {
                    type_paiement,
                    nom: nom || null,
                    date_dechiance: formattedDateDechiance,
                    banque: banque || null,
                    numero_compte: numero_compte || null,
                    remarque: remarque || null // AJOUT DU CHAMP REMARQUE DANS LA RÉPONSE
                }
            }
        });
    } catch (error) {
        await conn.rollback();
        console.error("Error creating abonnement:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        conn.release();
    }
};

// Fonction de renouvellement
export const renewAbonnement = async (req, res) => {
    const conn = await db.getConnection();
    const { id } = req.params;
    const { nouveau_prix_ttc, avance_paiement = 0, date_debut, date_fin } = req.body;
    
    try {
        await conn.beginTransaction();

        // 1. Récupérer l'ancien abonnement avec toutes ses données
        const [oldAbonnement] = await conn.execute(
            `SELECT a.*, 
                    g.nom as groupe_nom,
                    g.ecole_id,
                    c.nom as cours_nom
             FROM abnmts a
             LEFT JOIN \`groups\` g ON a.groupe_id = g.id
             LEFT JOIN cours c ON a.cours_id = c.id
             WHERE a.id = ?`,
            [id]
        );

        if (oldAbonnement.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: 'Abonnement non trouvé'
            });
        }

        const ancien = oldAbonnement[0];
        
        // 2. Vérifier les dates fournies
        let formattedDateDebut, formattedDateFin;
        
        if (date_debut && date_fin) {
            // Utiliser les dates fournies par le frontend
            const newDateDebut = new Date(date_debut);
            const newDateFin = new Date(date_fin);
            
            // Validation des dates
            if (newDateDebut >= newDateFin) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'La date de début doit être antérieure à la date de fin'
                });
            }
            
            // Calculer la durée en mois pour la validation
            let dureeMois = (newDateFin.getFullYear() - newDateDebut.getFullYear()) * 12;
            dureeMois -= newDateDebut.getMonth();
            dureeMois += newDateFin.getMonth();
            
            if (newDateFin.getDate() < newDateDebut.getDate()) {
                dureeMois--;
            }
            
            if (dureeMois <= 0) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'La durée doit être d\'au moins 1 mois'
                });
            }
            
            formattedDateDebut = newDateDebut.toISOString().split('T')[0];
            formattedDateFin = newDateFin.toISOString().split('T')[0];
            
            // Si la durée est différente, on met à jour la durée de l'abonnement
            if (dureeMois !== ancien.durer_mois) {
                // Mettre à jour la durée pour le nouvel abonnement
                ancien.durer_mois = dureeMois;
            }
        } else {
            // Si aucune date n'est fournie, calculer automatiquement comme avant
            const ancienneDateFin = new Date(ancien.date_fin);
            const nouvelleDateDebut = new Date(ancienneDateFin);
            nouvelleDateDebut.setDate(nouvelleDateDebut.getDate() + 1);
            
            const nouvelleDateFin = new Date(nouvelleDateDebut);
            nouvelleDateFin.setMonth(nouvelleDateFin.getMonth() + ancien.durer_mois);

            formattedDateDebut = nouvelleDateDebut.toISOString().split('T')[0];
            formattedDateFin = nouvelleDateFin.toISOString().split('T')[0];
        }

        // 3. Utiliser le nouveau prix si fourni, sinon garder l'ancien
        const prixTTC = nouveau_prix_ttc ? parseFloat(nouveau_prix_ttc) : ancien.prix_ttc;

        // 4. Vérifier si c'est un pack ou un abonnement normal
        let newAbonnementId = null;
        const datePack = new Date().toISOString().split('T')[0];

        if (ancien.pack_categorie_id) {
            // PACK : récupérer tous les adhérents et cours du pack
            const [packEntries] = await conn.execute(
                `SELECT DISTINCT adherent_id, ecole_id, group_id 
                 FROM pack 
                 WHERE abnmts_id = ?`,
                [id]
            );

            if (packEntries.length === 0) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Aucune entrée pack trouvée pour cet abonnement'
                });
            }

            // Créer le nouvel abonnement pack
            const firstEntry = packEntries[0];
            const [result] = await conn.execute(
                `INSERT INTO abnmts 
                    (adherent_id, cours_id, groupe_id, date_debut, date_fin, 
                     durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, remise, 
                     type_paiement, avance_paiement, banque, numero_compte, details_paiement, 
                     pack_categorie_id, nom, date_dechiance, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    firstEntry.adherent_id, 
                    firstEntry.ecole_id, 
                    firstEntry.group_id, 
                    formattedDateDebut, 
                    formattedDateFin, 
                    ancien.durer_mois, 
                    ancien.nombre_activiter, 
                    ancien.nombre_de_personne, 
                    prixTTC, 
                    ancien.remise,
                    ancien.type_paiement, 
                    0,
                    ancien.banque, 
                    ancien.numero_compte, 
                    ancien.details_paiement, 
                    ancien.pack_categorie_id,
                    ancien.nom,
                    ancien.date_dechiance
                ]
            );

            newAbonnementId = result.insertId;

            // Créer les entrées pack pour tous les adhérents
            for (const entry of packEntries) {
                await conn.execute(
                    'INSERT INTO pack (adherent_id, abnmts_id, date_pack, ecole_id, group_id) VALUES (?, ?, ?, ?, ?)',
                    [entry.adherent_id, newAbonnementId, datePack, entry.ecole_id, entry.group_id]
                );

                // Mettre à jour group_adherent
                if (entry.group_id) {
                    await conn.execute(
                        'INSERT INTO group_adherent (group_id, adherent_id, cours_id, date_abonnement, abnmts_id) VALUES (?, ?, ?, ?, ?)',
                        [entry.group_id, entry.adherent_id, entry.ecole_id, `${formattedDateDebut} - ${formattedDateFin}`, newAbonnementId]
                    );
                }
            }
        } else {
            // ABONNEMENT INDIVIDUEL
            const [result] = await conn.execute(
                `INSERT INTO abnmts 
                    (adherent_id, cours_id, groupe_id, date_debut, date_fin, 
                     durer_mois, nombre_activiter, nombre_de_personne, prix_ttc, remise, 
                     type_paiement, avance_paiement, banque, numero_compte, details_paiement, 
                     nom, date_dechiance, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    ancien.adherent_id, 
                    ancien.cours_id, 
                    ancien.groupe_id, 
                    formattedDateDebut, 
                    formattedDateFin, 
                    ancien.durer_mois, 
                    ancien.nombre_activiter, 
                    ancien.nombre_de_personne, 
                    prixTTC, 
                    ancien.remise,
                    ancien.type_paiement, 
                    0,
                    ancien.banque, 
                    ancien.numero_compte, 
                    ancien.details_paiement,
                    ancien.nom,
                    ancien.date_dechiance
                ]
            );

            newAbonnementId = result.insertId;

            // Vérifier les entrées pack existantes
            const [packEntries] = await conn.execute(
                'SELECT * FROM pack WHERE abnmts_id = ?',
                [id]
            );

            // Recréer les entrées pack si elles existent
            for (const entry of packEntries) {
                await conn.execute(
                    'INSERT INTO pack (adherent_id, abnmts_id, date_pack, ecole_id, group_id) VALUES (?, ?, ?, ?, ?)',
                    [entry.adherent_id, newAbonnementId, datePack, entry.ecole_id, entry.group_id]
                );
            }

            // Mettre à jour group_adherent
            if (ancien.groupe_id) {
                await conn.execute(
                    'INSERT INTO group_adherent (group_id, adherent_id, cours_id, date_abonnement, abnmts_id) VALUES (?, ?, ?, ?, ?)',
                    [ancien.groupe_id, ancien.adherent_id, ancien.cours_id, `${formattedDateDebut} - ${formattedDateFin}`, newAbonnementId]
                );
            }
        }

        // 5. Gérer l'avance de paiement
        if (avance_paiement && parseFloat(avance_paiement) > 0) {
            await conn.execute(
                `INSERT INTO historique_versements 
                    (abnmt_id, montant_verse, type_paiement_verse, details_versement) 
                 VALUES (?, ?, ?, ?)`,
                [
                    newAbonnementId,
                    parseFloat(avance_paiement),
                    ancien.type_paiement,
                    "Acompte initial lors du renouvellement"
                ]
            );

            await conn.execute(
                `UPDATE abnmts 
                 SET avance_paiement = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [parseFloat(avance_paiement), newAbonnementId]
            );
        }

        await conn.commit();
        
        // Calculer la durée réelle utilisée
        const dateDebutObj = new Date(formattedDateDebut);
        const dateFinObj = new Date(formattedDateFin);
        let dureeUtilisee = (dateFinObj.getFullYear() - dateDebutObj.getFullYear()) * 12;
        dureeUtilisee -= dateDebutObj.getMonth();
        dureeUtilisee += dateFinObj.getMonth();
        if (dateFinObj.getDate() < dateDebutObj.getDate()) {
            dureeUtilisee--;
        }
        
        res.status(201).json({
            success: true,
            data: { 
                id: newAbonnementId,
                ancien_abonnement_id: parseInt(id),
                dates: {
                    ancienne_date_fin: ancien.date_fin,
                    nouvelle_date_debut: formattedDateDebut,
                    nouvelle_date_fin: formattedDateFin,
                    duree_mois: dureeUtilisee
                },
                prix: {
                    ancien_prix: ancien.prix_ttc,
                    nouveau_prix: prixTTC
                },
                type_abonnement: ancien.pack_categorie_id ? 'pack' : 'individuel',
                message: 'Abonnement renouvelé avec succès'
            }
        });
    } catch (error) {
        await conn.rollback();
        console.error("Error renewing abonnement:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        conn.release();
    }
};

// Route pour enregistrer un versement dans l'historique
export const enregistrerVersement = async (req, res) => {
    const conn = await db.getConnection();
    
    try {
        const { 
            abnmt_id,
            montant_verse,
            type_paiement_verse,
            banque,
            numero_compte,
            details_versement
        } = req.body;

        // Validation des champs obligatoires
        if (!abnmt_id || !montant_verse || !type_paiement_verse) {
            return res.status(400).json({ 
                success: false,
                message: 'abnmt_id, montant_verse et type_paiement_verse sont requis'
            });
        }

        if (parseFloat(montant_verse) <= 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Le montant doit être supérieur à 0'
            });
        }

        await conn.beginTransaction();

        // 1. Vérifier que l'abonnement existe
        const [abonnement] = await conn.execute(
            'SELECT * FROM abnmts WHERE id = ?',
            [abnmt_id]
        );

        if (abonnement.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: 'Abonnement non trouvé'
            });
        }

        // 2. Insérer dans l'historique des versements
        const [resultHistorique] = await conn.execute(
            `INSERT INTO historique_versements 
                (abnmt_id, montant_verse, type_paiement_verse, banque, numero_compte, details_versement) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                abnmt_id,
                parseFloat(montant_verse),
                type_paiement_verse,
                banque || null,
                numero_compte || null,
                details_versement || null
            ]
        );

        // 3. Calculer le nouvel avance_paiement (somme de tous les versements)
        const [totalVersements] = await conn.execute(
            'SELECT SUM(montant_verse) as total FROM historique_versements WHERE abnmt_id = ?',
            [abnmt_id]
        );

        const nouvelAvance = totalVersements[0].total || 0;

        // 4. Mettre à jour l'avance_paiement dans la table abnmts
        await conn.execute(
            `UPDATE abnmts 
             SET avance_paiement = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [nouvelAvance, abnmt_id]
        );

        // 5. Récupérer les données mises à jour
        const [abonnementMisAJour] = await conn.execute(
            `SELECT 
                a.*,
                (SELECT SUM(montant_verse) FROM historique_versements WHERE abnmt_id = ?) as total_verse,
                (a.prix_ttc - (SELECT SUM(montant_verse) FROM historique_versements WHERE abnmt_id = ?)) as reste_a_payer
             FROM abnmts a 
             WHERE a.id = ?`,
            [abnmt_id, abnmt_id, abnmt_id]
        );

        await conn.commit();
        
        res.status(201).json({
            success: true,
            data: { 
                versement_id: resultHistorique.insertId,
                abonnement: abonnementMisAJour[0],
                total_verse: nouvelAvance,
                message: `Versement de ${montant_verse}€ enregistré avec succès`
            }
        });
    } catch (error) {
        await conn.rollback();
        console.error("Error recording payment:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        conn.release();
    }
};

// Route pour récupérer l'historique des versements
export const getHistoriqueVersements = async (req, res) => {
    try {
        const { abnmt_id } = req.params;

        const [versements] = await db.execute(
            `SELECT 
                hv.*,
                a.prix_ttc,
                a.avance_paiement,
                (a.prix_ttc - a.avance_paiement) AS reste_a_payer
             FROM historique_versements hv
             JOIN abnmts a ON hv.abnmt_id = a.id
             WHERE hv.abnmt_id = ?
             ORDER BY hv.date_versement DESC`,
            [abnmt_id]
        );

        const [totalVersements] = await db.execute(
            `SELECT 
                SUM(montant_verse) AS total_verse,
                COUNT(*) AS nombre_versements
             FROM historique_versements 
             WHERE abnmt_id = ?`,
            [abnmt_id]
        );

        res.status(200).json({
            success: true,
            data: {
                versements,
                resume: totalVersements[0]
            }
        });
    } catch (error) {
        console.error("Error fetching payment history:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// Récupérer tous les abonnements
export const getAllAbonnements = async (req, res) => {
    try {
        const abonnements = await Abonnement.getAll();
        res.json({
            success: true,
            data: abonnements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Récupérer le dernier ID d'abonnement (version optimisée)
export const getLastIdAbonnement = async (req, res) => {
    try {
        // Si votre modèle Abonnement a une méthode pour récupérer le dernier ID directement
        const lastAbonnement = await Abonnement.getLast();
        
        if (!lastAbonnement) {
            return res.json({
                success: true,
                lastId: 0
            });
        }
        
        res.json({
            success: true,
            lastId: lastAbonnement.id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Modifier Paiement controller
export const updatePaiement = async (req, res) => {
    try {
        const { id } = req.params;
        const paymentData = req.body;

        // Utiliser la méthode du modèle pour mettre à jour le paiement
        const result = await Abonnement.updatePaiement(id, paymentData);
        
        res.status(200).json({ 
            message: 'Paiement ajouté avec succès',
            data: result
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout du paiement:', error);
        
        if (error.message.includes('supérieur au reste à payer')) {
            return res.status(400).json({ 
                success: false,
                message: error.message 
            });
        }
        
        if (error.message.includes('non trouvé')) {
            return res.status(404).json({ 
                success: false,
                message: error.message 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Erreur serveur lors de l\'ajout du paiement' 
        });
    }
};

// Controller pour récupérer les infos de paiement
export const getPaiementInfo = async (req, res) => {
    try {
        const { id } = req.params;
        
        const paiementInfo = await Abonnement.getPaiementInfo(id);
        
        res.status(200).json({
            success: true,
            data: paiementInfo
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des infos de paiement:', error);
        
        if (error.message.includes('non trouvé')) {
            return res.status(404).json({ 
                success: false,
                message: error.message 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Erreur serveur lors de la récupération des informations' 
        });
    }
};

// Supprimer un abonnement
export const deleteAbonnement = async (req, res) => {
    try {
        const result = await Abonnement.delete(req.params.id);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Abonnement non trouvé'
            });
        }
        
        res.json({
            success: true,
            message: 'Abonnement supprimé avec succès'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Récupérer les abonnements d'un adhérent
export const getAbonnementsByAdherent = async (req, res) => {
    try {
        const abonnements = await Abonnement.getByAdherentId(req.params.adherent_id);
        res.json({
            success: true,
            data: abonnements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Récupérer les abonnements pour un cours
export const getAbonnementsByCours = async (req, res) => {
    try {
        const abonnements = await Abonnement.getByCoursId(req.params.cours_id);
        res.json({
            success: true,
            data: abonnements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Récupérer les abonnements pour un groupe
export const getAbonnementsByGroupe = async (req, res) => {
    try {
        const abonnements = await Abonnement.getByGroupeId(req.params.groupe_id);
        res.json({
            success: true,
            data: abonnements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Récupérer les groupes pour un cours
export const getGroupesByCours = async (req, res) => {
    try {
        const groupes = await Abonnement.getGroupesByCoursId(req.params.cours_id);
        res.json({
            success: true,
            data: groupes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Vérifier si un abonnement existe
export const checkAbonnementExists = async (req, res) => {
    try {
        const exists = await Abonnement.checkExisting(
            req.params.adherent_id,
            req.params.cours_id
        );
        res.json({
            success: true,
            data: { exists }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Obtenir le nombre total d'abonnements
export const getAbonnementsCount = async (req, res) => {
    try {
        const count = await Abonnement.getCount();
        res.json({
            success: true,
            data: { count }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};