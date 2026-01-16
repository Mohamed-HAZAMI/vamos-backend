import pool from "../config/db.js";


// Fonction pour récupérer les groupes par école
export const getGroupesParEcole = async (req, res) => {
    try {
        const { ecole_id } = req.query;
        
        if (!ecole_id) {
            return res.status(400).json({ 
                success: false,
                error: 'L\'ID de l\'école est requis' 
            });
        }
        
        const [groupes] = await pool.execute(
            'SELECT id, nom FROM `groups` WHERE ecole_id = ? ORDER BY nom ASC',
            [ecole_id]
        );
        
        res.json({
            success: true,
            count: groupes.length,
            groupes
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des groupes:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la récupération des groupes',
            details: error.message 
        });
    }
};

// Fonction pour récupérer tous les groupes
export const getTousGroupes = async (req, res) => {
    try {
        const [groupes] = await pool.execute(
            `SELECT g.id, g.nom, e.nom as nom_ecole 
             FROM \`groups\` g 
             JOIN ecoles e ON g.ecole_id = e.id 
             ORDER BY e.nom, g.nom ASC`
        );
        
        res.json({
            success: true,
            count: groupes.length,
            groupes
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des groupes:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la récupération des groupes',
            details: error.message 
        });
    }
};

// Fonction pour récupérer toutes les écoles
export const getEcoles = async (req, res) => {
    try {
        const [ecoles] = await pool.execute(
            'SELECT id, nom FROM ecoles ORDER BY nom ASC'
        );
        
        res.json({
            success: true,
            count: ecoles.length,
            ecoles
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des écoles:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la récupération des écoles',
            details: error.message 
        });
    }
};

// Fonction pour calculer les recettes avec filtres école et groupe
export const calculerRecettes = async (req, res) => {
    try {
        const { date_debut, date_fin, cours_id, groupe_id } = req.query;
        
        // Validation des dates
        if (!date_debut || !date_fin) {
            return res.status(400).json({ 
                success: false,
                error: 'Les dates de début et de fin sont requises' 
            });
        }

        // Convertir les dates
        const startDate = new Date(date_debut);
        const endDate = new Date(date_fin);
        
        if (startDate > endDate) {
            return res.status(400).json({ 
                success: false,
                error: 'La date de début doit être antérieure à la date de fin' 
            });
        }

        // Construction de la requête SQL
        let query = `
            SELECT 
                a.id,
                a.adherent_id,
                a.cours_id,
                a.groupe_id,
                a.date_debut as abonnement_debut,
                a.date_fin as abonnement_fin,
                a.prix_ttc,
                a.remise,
                a.durer_mois,
                e.nom as nom_ecole,
                g.nom as nom_groupe,
                a.prix_ttc * (1 - COALESCE(a.remise, 0) / 100) as prix_apres_remise
            FROM abnmts a
            JOIN ecoles e ON a.cours_id = e.id
            LEFT JOIN \`groups\` g ON a.groupe_id = g.id
            WHERE a.date_debut <= ? 
                AND a.date_fin >= ?
        `;

        const params = [date_fin, date_debut];

        // Filtrer par cours_id si spécifié
        if (cours_id && cours_id !== 'tous') {
            query += ` AND a.cours_id = ?`;
            params.push(cours_id);
        }

        // Filtrer par groupe_id si spécifié
        if (groupe_id && groupe_id !== 'tous') {
            query += ` AND a.groupe_id = ?`;
            params.push(groupe_id);
        }

        // Ajouter le tri
        query += ` ORDER BY e.nom, g.nom, a.date_debut`;

        // Exécuter la requête
        const [abonnements] = await pool.execute(query, params);
        
        // Calculer les recettes avec un mois = 30 jours
        const resultats = abonnements.map(abonnement => {
            const {
                prix_apres_remise,
                durer_mois,
                abonnement_debut,
                abonnement_fin
            } = abonnement;
            
            // 1. Durée de l'abonnement en jours (mois = 30 jours)
            const dureeMois = durer_mois || 1;
            const dureeJoursAbonnement = dureeMois * 30; // Mois = 30 jours
            
            // 2. Prix journalier (basé sur mois de 30 jours)
            const prixJournalier = prix_apres_remise / dureeJoursAbonnement;
            
            // 3. Calculer le chevauchement en jours réels
            const debutAb = new Date(abonnement_debut);
            const finAb = new Date(abonnement_fin);
            const debutPer = new Date(date_debut);
            const finPer = new Date(date_fin);
            
            // Si pas de chevauchement
            if (finAb < debutPer || debutAb > finPer) {
                return {
                    ...abonnement,
                    duree_mois: dureeMois,
                    duree_jours: dureeJoursAbonnement,
                    prix_journalier: parseFloat(prixJournalier.toFixed(2)),
                    jours_chevauchement: 0,
                    recette_periode: 0
                };
            }
            
            // Dates de chevauchement
            const debutChev = debutAb > debutPer ? debutAb : debutPer;
            const finChev = finAb < finPer ? finAb : finPer;
            
            // Jours de chevauchement réels
            const joursChevauchement = Math.ceil((finChev - debutChev) / (1000 * 60 * 60 * 24)) + 1;
            
            // 4. Recette pour la période = prix journalier × jours de chevauchement
            const recette = prixJournalier * joursChevauchement;
            
            return {
                ...abonnement,
                duree_mois: dureeMois,
                duree_jours: dureeJoursAbonnement,
                prix_journalier: parseFloat(prixJournalier.toFixed(2)),
                jours_chevauchement: joursChevauchement,
                recette_periode: parseFloat(recette.toFixed(2))
            };
        });

        // Calcul des totaux
        const totalRecette = resultats.reduce((sum, item) => sum + item.recette_periode, 0);
        const nombreAbonnements = resultats.length;
        
        // Calcul par école
        const recettesParEcole = {};
        // Calcul par groupe
        const recettesParGroupe = {};
        
        resultats.forEach(item => {
            const ecoleNom = item.nom_ecole;
            const groupeNom = item.nom_groupe || 'Sans groupe';
            
            // Par école
            if (!recettesParEcole[ecoleNom]) {
                recettesParEcole[ecoleNom] = {
                    total: 0,
                    count: 0
                };
            }
            recettesParEcole[ecoleNom].total += item.recette_periode;
            recettesParEcole[ecoleNom].count += 1;
            
            // Par groupe
            const keyGroupe = `${ecoleNom} - ${groupeNom}`;
            if (!recettesParGroupe[keyGroupe]) {
                recettesParGroupe[keyGroupe] = {
                    ecole: ecoleNom,
                    groupe: groupeNom,
                    total: 0,
                    count: 0
                };
            }
            recettesParGroupe[keyGroupe].total += item.recette_periode;
            recettesParGroupe[keyGroupe].count += 1;
        });

        res.json({
            success: true,
            periode: {
                date_debut,
                date_fin
            },
            filtres: {
                cours_id: cours_id || 'tous',
                groupe_id: groupe_id || 'tous'
            },
            recettes: resultats,
            resume: {
                nombre_abonnements: nombreAbonnements,
                total_recette: parseFloat(totalRecette.toFixed(2)),
                recette_moyenne: nombreAbonnements > 0 
                    ? parseFloat((totalRecette / nombreAbonnements).toFixed(2))
                    : 0,
                recettes_par_ecole: recettesParEcole,
                recettes_par_groupe: recettesParGroupe
            }
        });

    } catch (error) {
        console.error('Erreur lors du calcul des recettes:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors du calcul des recettes',
            details: error.message 
        });
    }
};