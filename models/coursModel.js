import db from '../config/db.js';

const Cours = {
    // Créer un nouveau cours
    create: async (nom, tarif_horaire) => {
        const query = `INSERT INTO cours (nom, tarif_horaire) VALUES (?, ?)`;
        try {
            const [result] = await db.execute(query, [nom, tarif_horaire]);
            return result;
        } catch (err) {
            throw err;
        }
    },

    // Obtenir tous les cours
    getAll: async () => {
        const query = `SELECT * FROM cours`;
        try {
            const [results] = await db.execute(query);
            return results;
        } catch (err) {
            throw err;
        }
    },

    // Obtenir un cours par ID
    getById: async (id) => {
        const query = `SELECT * FROM cours WHERE id = ?`;
        try {
            const [results] = await db.execute(query, [id]);
            return results;
        } catch (err) {
            throw err;
        }
    },

    // Mettre à jour un cours
    update: async (id, nom, tarif_horaire) => {
        const query = 'UPDATE cours SET nom = ?, tarif_horaire = ? WHERE id = ?';
        try {
            const [result] = await db.execute(query, [nom, tarif_horaire, id]);
            return result;
        } catch (err) {
            throw err;
        }
    },

    // Supprimer un cours
    delete: async (id) => {
        const query = 'DELETE FROM cours WHERE id = ?';
        try {
            const [result] = await db.execute(query, [id]);
            return result;
        } catch (err) {
            throw err;
        }
    },

    // Obtenir le nombre total de cours
    getCount: async () => {
        const query = 'SELECT COUNT(*) as total FROM cours';
        try {
            const [results] = await db.execute(query);
            return results[0].total;
        } catch (err) {
            throw err;
        }
    },

    // Récupérer les noms de tous les cours
    getCoursNames: async () => {
        const query = 'SELECT nom FROM cours';
        try {
            const [results] = await db.execute(query);
            return results.map(row => row.nom);
        } catch (err) {
            throw err;
        }
    }
};

export default Cours;