import pool from "../config/db.js";

class Adherent {
    static async create(
        nom,
        prenom,
        email,
        cours_id,
        groupe_id,
        password,
        role,
        phone,
        phone2 = null,
        assurance = null,
        date_validite_assurance = null,
        image = null,
        date_naissance = null,
        // Nouveaux paramètres
        type_paiement_assurance = null,
        banque = null,
        numero_compte = null,
        details_paiement = null
    ) {
        const finalEmail = email && email.trim() !== '' ? email : null;

        const [result] = await pool.query(
            `INSERT INTO adherents 
            (nom, prenom, email, ecole_id, groupe_id, password, role, phone, phone2, 
             assurance, date_validite_assurance, image, date_naissance,
             type_paiement_assurance, banque, numero_compte, details_paiement) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nom, prenom, finalEmail, cours_id, groupe_id, password, role, phone, phone2,
                assurance, date_validite_assurance, image, date_naissance,
                type_paiement_assurance, banque, numero_compte, details_paiement
            ]
        );
        return result.insertId;
    }

static async update(
    id,
    nom,
    prenom,
    email,
    cour_id,
    groupe_id,
    role,
    phone,
    phone2 = null,
    assurance = null,
    date_validite_assurance = null,
    image = null,
    date_naissance = null,
    type_paiement_assurance = null,
    banque = null,
    numero_compte = null,
    details_paiement = null,
    password = null, // Peut être null pour garder l'ancien
    image1 = null,
    image2 = null,
    image3 = null
) {
    const finalEmail = email && email.trim() !== '' ? email : null;

    let query = `UPDATE adherents SET 
        nom = ?, prenom = ?, email = ?, ecole_id = ?, groupe_id = ?, role = ?, 
        phone = ?, phone2 = ?, assurance = ?, date_validite_assurance = ?, 
        date_naissance = ?, type_paiement_assurance = ?, banque = ?, 
        numero_compte = ?, details_paiement = ?`;
    
    let params = [
        nom, prenom, finalEmail, cour_id, groupe_id, role, phone, phone2,
        assurance, date_validite_assurance, date_naissance, type_paiement_assurance,
        banque, numero_compte, details_paiement
    ];

    // Ajouter le mot de passe seulement s'il est fourni (non null)
    if (password !== null) {
        query += ", password = ?";
        params.push(password);
    } 

    // Ajouter les images si elles sont fournies
    if (image !== undefined) {
        query += ", image = ?";
        params.push(image);
    }

    if (image1 !== undefined) {
        query += ", image1 = ?";
        params.push(image1);
    }

    if (image2 !== undefined) {
        query += ", image2 = ?";
        params.push(image2);
    }

    if (image3 !== undefined) {
        query += ", image3 = ?";
        params.push(image3);
    }

    query += " WHERE id = ?";
    params.push(id);

    const [result] = await pool.query(query, params);
    return result.affectedRows;
}

    // Méthode pour mettre à jour uniquement l'image principale
    static async updateImage(id, image) {
        const [result] = await pool.query(
            "UPDATE adherents SET image = ? WHERE id = ?",
            [image, id]
        );
        return result.affectedRows;
    }

    // Méthode pour mettre à jour un champ image spécifique (image1, image2, image3)
    static async updateImageField(id, fieldName, image) {
        try {
            // Valider que le champ est autorisé
            const allowedFields = ['image1', 'image2', 'image3', 'image'];
            if (!allowedFields.includes(fieldName)) {
                throw new Error(`Champ non autorisé: ${fieldName}`);
            }

            const [result] = await pool.query(
                `UPDATE adherents SET ${fieldName} = ? WHERE id = ?`,
                [image, id]
            );
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    }

    // Méthode pour mettre à jour plusieurs images en une fois
    static async updateMultipleImages(id, imagesData) {
        try {
            const { image1, image2, image3, image } = imagesData;
            
            // Construire dynamiquement la requête
            let query = "UPDATE adherents SET ";
            const params = [];
            const updates = [];

            if (image1 !== undefined) {
                updates.push("image1 = ?");
                params.push(image1);
            }
            
            if (image2 !== undefined) {
                updates.push("image2 = ?");
                params.push(image2);
            }
            
            if (image3 !== undefined) {
                updates.push("image3 = ?");
                params.push(image3);
            }

            if (image !== undefined) {
                updates.push("image = ?");
                params.push(image);
            }

            if (updates.length === 0) {
                return 0; // Aucune mise à jour
            }

            query += updates.join(", ") + " WHERE id = ?";
            params.push(id);

            const [result] = await pool.query(query, params);
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    }

    // Méthode pour récupérer un adhérent avec toutes ses images
    static async getByIdWithAllImages(id) {
        const [rows] = await pool.query(
            "SELECT id, nom, prenom, email, image, image1, image2, image3 FROM adherents WHERE id = ?",
            [id]
        );
        
        if (rows.length === 0) {
            return null;
        }
        
        return rows[0];
    }

    // Méthode pour supprimer une image spécifique
    static async deleteImageField(id, fieldName) {
        try {
            const allowedFields = ['image1', 'image2', 'image3', 'image'];
            if (!allowedFields.includes(fieldName)) {
                throw new Error(`Champ non autorisé: ${fieldName}`);
            }

            const [result] = await pool.query(
                `UPDATE adherents SET ${fieldName} = NULL WHERE id = ?`,
                [id]
            );
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    }

    static async getAll() {
        const [rows] = await pool.query("SELECT * FROM adherents");
        return rows;
    }

    static async getById(id) {
        const [adherentRows] = await pool.query(
            "SELECT * FROM adherents WHERE id = ?",
            [id]
        );

        if (!adherentRows[0]) {
            return null;
        }

        const adherent = adherentRows[0];

        // Récupérer les abonnements de base
        const [abonnementsRows] = await pool.query(
            `
                SELECT * FROM abnmts 
                WHERE adherent_id = ?
                ORDER BY date_debut DESC
            `,
            [id]
        );

        // Pour chaque abonnement, récupérer les détails du cours, du groupe et les autres adhérents
        const abonnements = await Promise.all(
            abonnementsRows.map(async (abonnement) => {
                // Récupérer les informations du cours
                const [coursRows] = await pool.query(
                    "SELECT * FROM cours WHERE id = ?",
                    [abonnement.cours_id]
                );
                const cours = coursRows[0] || null;

                // Récupérer les informations du groupe et de l'école
                const [groupeRows] = await pool.query(
                    `
                        SELECT g.*, e.nom as ecole_nom 
                        FROM \`groups\` g
                        LEFT JOIN ecoles e ON g.ecole_id = e.id
                        WHERE g.id = ?
                    `,
                    [abonnement.groupe_id]
                );
                const groupe = groupeRows[0] || null;

                // Récupérer TOUS les adhérents qui partagent le même abonnement via la table pack
                const [allAdherenByabnmtsRows] = await pool.query(
                    `
                        SELECT a.* , a.nom as nom_adherent, g.*, e.nom as ecole_nom
                        FROM pack p
                        INNER JOIN adherents a ON p.adherent_id = a.id
                        LEFT JOIN \`groups\` g ON p.group_id = g.id
                        LEFT JOIN ecoles e ON g.ecole_id = e.id
                        WHERE p.abnmts_id = ?
                    `,
                    [abonnement.id]
                );

                // Formater tous les adhérents avec leurs groupes
                const allAdherenByabnmts = allAdherenByabnmtsRows.map(row => ({
                    id: row.id,
                    nom_adherent: row.nom_adherent,
                    prenom: row.prenom,
                    email: row.email,
                    phone: row.phone,
                    phone2: row.phone2,
                    image: row.image,
                    date_naissance: row.date_naissance,
                    is_current: row.id === parseInt(id),
                    groupe: row.id ? {
                        id: row.group_id,
                        nom: row.nom,
                        description: row.description,
                        ecole_id: row.ecole_id,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                        ecole_nom: row.ecole_nom
                    } : null
                }));

                const atherAdheren = allAdherenByabnmts.filter(ad => !ad.is_current);

                const { cours_id, groupe_id, ...abonnementData } = abonnement;

                return {
                    ...abonnementData,
                    cours,
                    groupe,
                    atherAdheren,
                    allAdherenByabnmts
                };
            })
        );

        adherent.abonnements = abonnements;
        return adherent;
    }

    static async getAllNames() {
        const [rows] = await pool.query(
            'SELECT id, CONCAT(prenom, " ", nom) AS full_name, image FROM adherents ORDER BY nom, prenom'
        );
        return rows;
    }

static async getByGroupAndDate(groupId, date) {
    const [rows] = await pool.query(
        `
SELECT * FROM (
    SELECT 
        a.*, 
        ab.id as abonnement_id, -- AJOUT DE L'ID DE L'ABONNEMENT
        ab.date_fin as date_expiration_abonnement,
        ab.remarque as remarque,
        ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY ab.date_fin DESC) as rn
    FROM adherents a
    JOIN group_adherent ga ON a.id = ga.adherent_id
    JOIN pack pa ON a.id = pa.adherent_id
    JOIN abnmts ab ON ab.id = pa.abnmts_id
    JOIN ecoles e ON ab.cours_id = e.id 
    WHERE ga.group_id = ?
    AND ? BETWEEN ab.date_debut AND ab.date_fin
) ranked
WHERE rn = 1
        `,
        [groupId, date]
    );
    return rows;
}

    static async getByGroupAndCourse(groupId, idCour) {
        const [rows] = await pool.query(
            `
SELECT DISTINCT 
    a.id,
    a.nom,
    a.prenom,
    a.email,
    a.phone,
    a.phone2,
    a.date_naissance,
    a.role,
    a.image,
    a.image1,
    a.image2,
    a.image3,
    a.created_at,
    a.updated_at,
    a.archiver,
    e.nom AS ecole_nom,
    CASE 
        WHEN last_abn.id IS NULL THEN 'sans_abonnement'
        WHEN last_abn.date_fin < CURDATE() THEN 
            CASE 
                WHEN last_abn.avance_paiement >= last_abn.prix_ttc THEN 'expirer_payer'
                ELSE 'expirer_non_payer'
            END
        ELSE 
            CASE 
                WHEN last_abn.avance_paiement >= last_abn.prix_ttc THEN 'nonexpirer_payer'
                ELSE 'nonexpirer_non_payer'
            END
    END AS statut_abonnement,
    last_abn.id AS id_abonnement,  -- Ajout de l'ID de l'abonnement
    last_abn.date_debut AS dernier_date_debut,
    last_abn.date_fin AS dernier_date_fin,
    last_abn.prix_ttc AS dernier_prix_ttc,
    last_abn.avance_paiement AS dernier_avance_paiement
FROM adherents a
JOIN ecoles e ON a.ecole_id = e.id 
LEFT JOIN (
    SELECT 
        ab1.*,
        ROW_NUMBER() OVER (PARTITION BY ab1.adherent_id ORDER BY ab1.date_debut DESC) as rn
    FROM abnmts ab1
) last_abn ON a.id = last_abn.adherent_id AND last_abn.rn = 1
WHERE a.groupe_id = ?
AND a.ecole_id = ?
            `,
            [groupId, idCour]
        );
        return rows;
    }

    static async delete(id) {
        const [result] = await pool.query("DELETE FROM adherents WHERE id = ?", [id]);
        return result.affectedRows;
    }

    static async countAll() {
        const [rows] = await pool.query("SELECT COUNT(*) AS total FROM adherents");
        return rows[0].total;
    }

    static async archive(id) {
        try {
            const [result] = await pool.execute(
                'UPDATE adherents SET archiver = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    }

    static async unarchive(id) {
        try {
            const [result] = await pool.execute(
                'UPDATE adherents SET archiver = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );
            return result.affectedRows;
        } catch (error) {
            throw error;
        }
    }

    // Méthode pour obtenir les adhérents par groupe
    static async getByGroupId(groupId) {
        const [rows] = await pool.query(
            "SELECT * FROM adherents WHERE groupe_id = ? AND archiver = 0",
            [groupId]
        );
        return rows;
    }

    // Méthode pour obtenir les adhérents par école
    static async getByEcoleId(ecoleId) {
        const [rows] = await pool.query(
            "SELECT * FROM adherents WHERE ecole_id = ? AND archiver = 0",
            [ecoleId]
        );
        return rows;
    }

    // Méthode pour rechercher des adhérents par nom ou prénom
    static async searchByName(searchTerm) {
        const [rows] = await pool.query(
            "SELECT * FROM adherents WHERE (nom LIKE ? OR prenom LIKE ?) AND archiver = 0",
            [`%${searchTerm}%`, `%${searchTerm}%`]
        );
        return rows;
    }

    // Méthode pour vérifier si un email existe déjà
    static async emailExists(email, excludeId = null) {
        let query = "SELECT COUNT(*) as count FROM adherents WHERE email = ?";
        const params = [email];

        if (excludeId) {
            query += " AND id != ?";
            params.push(excludeId);
        }

        const [rows] = await pool.query(query, params);
        return rows[0].count > 0;
    }

    // Méthode pour obtenir le nombre total d'adhérents archivés
    static async countArchived() {
        const [rows] = await pool.query("SELECT COUNT(*) AS total FROM adherents WHERE archiver = 1");
        return rows[0].total;
    }

    // Méthode pour obtenir le nombre total d'adhérents non archivés
    static async countActive() {
        const [rows] = await pool.query("SELECT COUNT(*) AS total FROM adherents WHERE archiver = 0");
        return rows[0].total;
    }
}

export default Adherent;