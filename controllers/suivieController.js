import pool from "../config/db.js";

// Récupérer tous les commentaires d'un adhérent
export const getCommentairesByAdherent = async (req, res) => {
    try {
        const { id_adherent } = req.params;
        
        const [rows] = await pool.execute(
            `SELECT s.*, 
                    u.email as coach_email,
                    COALESCE(a.nom, u.email) as coach_nom,
                    COALESCE(a.prenom, 'Coach') as coach_prenom
             FROM suivie s
             LEFT JOIN users u ON s.id_coach = u.id
             LEFT JOIN adherents a ON u.email = a.email
             WHERE s.id_adherent = ?
             ORDER BY s.created_at DESC`,
            [id_adherent]
        );

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des commentaires:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de la récupération des commentaires' 
        });
    }
};

// Ajouter un nouveau commentaire
export const createCommentaire = async (req, res) => {
    try {
        const { commentaire, id_adherent, id_coach } = req.body;

        if (!commentaire || !id_adherent || !id_coach) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tous les champs sont requis (commentaire, id_adherent, id_coach)' 
            });
        }

        // Vérifier si l'adhérent existe dans la table adherents
        const [adherentExists] = await pool.execute(
            'SELECT id, nom, prenom FROM adherents WHERE id = ?',
            [id_adherent]
        );

        if (adherentExists.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Adhérent non trouvé' 
            });
        }

        // Vérifier si le coach existe dans la table users
        const [coachExists] = await pool.execute(
            'SELECT id, email, role FROM users WHERE id = ? AND role IN ("coach", "admin")',
            [id_coach]
        );

        if (coachExists.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Coach non trouvé ou non autorisé' 
            });
        }

        // Insérer le commentaire
        const [result] = await pool.execute(
            'INSERT INTO suivie (commentaire, id_adherent, id_coach) VALUES (?, ?, ?)',
            [commentaire, id_adherent, id_coach]
        );

        // Récupérer le commentaire créé avec les infos du coach
        const [newComment] = await pool.execute(
            `SELECT s.*, 
                    u.email as coach_email,
                    COALESCE(a.nom, u.email) as coach_nom,
                    COALESCE(a.prenom, 'Coach') as coach_prenom
             FROM suivie s
             LEFT JOIN users u ON s.id_coach = u.id
             LEFT JOIN adherents a ON u.email = a.email
             WHERE s.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Commentaire ajouté avec succès',
            data: newComment[0]
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout du commentaire:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de l\'ajout du commentaire' 
        });
    }
};

// Mettre à jour un commentaire
export const updateCommentaire = async (req, res) => {
    try {
        const { id } = req.params;
        const { commentaire, id_coach } = req.body;

        if (!commentaire || !id_coach) {
            return res.status(400).json({ 
                success: false, 
                message: 'Le commentaire et l\'ID coach sont requis' 
            });
        }

        // Vérifier si le commentaire existe et appartient au coach
        const [existing] = await pool.execute(
            'SELECT id, id_coach FROM suivie WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Commentaire non trouvé' 
            });
        }

        if (existing[0].id_coach != id_coach) {
            return res.status(403).json({ 
                success: false, 
                message: 'Vous ne pouvez modifier que vos propres commentaires' 
            });
        }

        // Mettre à jour le commentaire
        await pool.execute(
            'UPDATE suivie SET commentaire = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND id_coach = ?',
            [commentaire, id, id_coach]
        );

        // Récupérer le commentaire mis à jour
        const [updated] = await pool.execute(
            `SELECT s.*, 
                    u.email as coach_email,
                    COALESCE(a.nom, u.email) as coach_nom,
                    COALESCE(a.prenom, 'Coach') as coach_prenom
             FROM suivie s
             LEFT JOIN users u ON s.id_coach = u.id
             LEFT JOIN adherents a ON u.email = a.email
             WHERE s.id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Commentaire mis à jour avec succès',
            data: updated[0]
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du commentaire:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de la mise à jour du commentaire' 
        });
    }
};

// Supprimer un commentaire
export const deleteCommentaire = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_coach } = req.body;

        if (!id_coach) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID coach requis' 
            });
        }

        // Vérifier si le commentaire existe et appartient au coach
        const [existing] = await pool.execute(
            'SELECT id_coach FROM suivie WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Commentaire non trouvé' 
            });
        }

        if (existing[0].id_coach != id_coach) {
            return res.status(403).json({ 
                success: false, 
                message: 'Vous ne pouvez supprimer que vos propres commentaires' 
            });
        }

        // Supprimer le commentaire
        await pool.execute(
            'DELETE FROM suivie WHERE id = ? AND id_coach = ?',
            [id, id_coach]
        );

        res.json({
            success: true,
            message: 'Commentaire supprimé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression du commentaire:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de la suppression du commentaire' 
        });
    }
};

// Récupérer les stats de suivi d'un adhérent
export const getStatsAdherent = async (req, res) => {
    try {
        const { id_adherent } = req.params;
        
        // Compter le nombre total de commentaires
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM suivie WHERE id_adherent = ?',
            [id_adherent]
        );
        
        // Récupérer le dernier commentaire
        const [lastComment] = await pool.execute(
            `SELECT s.*, 
                    u.email as coach_email,
                    COALESCE(a.nom, u.email) as coach_nom,
                    COALESCE(a.prenom, 'Coach') as coach_prenom
             FROM suivie s
             LEFT JOIN users u ON s.id_coach = u.id
             LEFT JOIN adherents a ON u.email = a.email
             WHERE s.id_adherent = ?
             ORDER BY s.created_at DESC
             LIMIT 1`,
            [id_adherent]
        );
        
        // Récupérer le nombre de coachs différents ayant commenté
        const [coachesResult] = await pool.execute(
            'SELECT COUNT(DISTINCT id_coach) as total_coaches FROM suivie WHERE id_adherent = ?',
            [id_adherent]
        );
        
        res.json({
            success: true,
            data: {
                total_commentaires: countResult[0].total || 0,
                total_coaches: coachesResult[0].total_coaches || 0,
                dernier_commentaire: lastComment[0] || null
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de la récupération des stats' 
        });
    }
};