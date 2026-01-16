import Cours from '../models/coursModel.js';

// Créer un nouveau cours
export const createCours = async (req, res) => {
    const { nom, tarif_horaire } = req.body;
    try {
        const result = await Cours.create(nom, tarif_horaire);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Obtenir tous les cours
export const getAllCours = async (req, res) => {
    try {
        const results = await Cours.getAll();
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Obtenir un cours par ID
export const getCoursById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Cours.getById(id);
        if (result.length === 0) {
            res.status(404).json({ message: 'Cours non trouvé' });
        } else {
            res.status(200).json(result[0]);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Mettre à jour un cours
export const updateCours = async (req, res) => {
    const { id } = req.params;
    const { nom, tarif_horaire } = req.body;
    try {
        const result = await Cours.update(id, nom, tarif_horaire);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Supprimer un cours
export const deleteCours = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Cours.delete(id);
        res.status(200).json({ message: 'Cours supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Obtenir le nombre total de cours
export const getCoursCount = async (req, res) => {
    try {
        const count = await Cours.getCount();
        res.status(200).json({ total: count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Obtenir les noms de tous les cours
export const fetchCoursNames = async (req, res) => {
    try {
        const names = await Cours.getCoursNames();
        res.status(200).json(names);
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération des noms des cours' });
    }
};