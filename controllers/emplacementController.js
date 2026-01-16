import { 
  getEmplacements, 
  getEmplacementById, 
  createEmplacement, 
  updateEmplacementModel, 
  deleteEmplacementModel, 
  getEmplacementNames,
  getEmplacementTypes
} from '../models/emplacementModel.js';

// Obtenir tous les emplacements
export const fetchEmplacements = async (req, res) => {
  try {
    const emplacements = await getEmplacements();
    res.json(emplacements);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des emplacements' });
  }
};

// Obtenir un emplacement par ID
export const fetchEmplacementById = async (req, res) => {
  try {
    const emplacement = await getEmplacementById(req.params.id);
    if (!emplacement) return res.status(404).json({ error: 'Emplacement non trouvé' });
    res.json(emplacement);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'emplacement' });
  }
};

// Créer un emplacement
export const addEmplacement = async (req, res) => {
  try {
    const { 
      nom, 
      tarif_seance, 
      duree_seance, 
      status, 
      type, 
      nombre_terrains, 
      date_ouverture, 
      date_fermeture, 
      nombre_seances 
    } = req.body;

    // Validation des données
    if (!nom || !tarif_seance || !type) {
      return res.status(400).json({ error: 'Nom, tarif et type sont obligatoires' });
    }

    if (isNaN(parseFloat(tarif_seance))) {
      return res.status(400).json({ error: 'Tarif doit être un nombre' });
    }

    if (nombre_terrains && (isNaN(nombre_terrains) || nombre_terrains < 1 || nombre_terrains > 10)) {
      return res.status(400).json({ error: 'Le nombre de terrains doit être entre 1 et 10' });
    }

    if (nombre_seances && (isNaN(nombre_seances) || nombre_seances < 1 || nombre_seances > 100)) {
      return res.status(400).json({ error: 'Le nombre de séances doit être entre 1 et 100' });
    }

    if (duree_seance && (isNaN(duree_seance) || duree_seance < 15 || duree_seance > 240)) {
      return res.status(400).json({ error: 'La durée de séance doit être entre 15 et 240 minutes' });
    }

    const emplacementData = {
      nom,
      tarif_seance: parseFloat(tarif_seance),
      duree_seance: duree_seance || 60,
      status: status || 'disponible',
      type,
      nombre_terrains: nombre_terrains || 1,
      date_ouverture,
      date_fermeture,
      nombre_seances: nombre_seances || 1
    };

    const emplacementId = await createEmplacement(emplacementData);
    res.status(201).json({ 
      id: emplacementId, 
      message: 'Emplacement ajouté avec succès',
      data: emplacementData
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'ajout de l\'emplacement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mettre à jour un emplacement
export const updateEmplacement = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nom, 
      tarif_seance, 
      duree_seance, 
      status, 
      type, 
      nombre_terrains, 
      date_ouverture, 
      date_fermeture, 
      nombre_seances 
    } = req.body;

    // Validation des données
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    if (nombre_terrains && (isNaN(nombre_terrains) || nombre_terrains < 1 || nombre_terrains > 10)) {
      return res.status(400).json({ error: 'Le nombre de terrains doit être entre 1 et 10' });
    }

    if (nombre_seances && (isNaN(nombre_seances) || nombre_seances < 1 || nombre_seances > 100)) {
      return res.status(400).json({ error: 'Le nombre de séances doit être entre 1 et 100' });
    }

    if (duree_seance && (isNaN(duree_seance) || duree_seance < 15 || duree_seance > 240)) {
      return res.status(400).json({ error: 'La durée de séance doit être entre 15 et 240 minutes' });
    }

    if (tarif_seance && isNaN(parseFloat(tarif_seance))) {
      return res.status(400).json({ error: 'Tarif doit être un nombre' });
    }

    // Préparation des données à mettre à jour
    const updateData = {
      nom,
      tarif_seance: tarif_seance ? parseFloat(tarif_seance) : undefined,
      duree_seance,
      status,
      type,
      nombre_terrains,
      date_ouverture,
      date_fermeture,
      nombre_seances
    };

    // Nettoyage des données (enlève les champs undefined)
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    // Vérification qu'il y a bien des données à mettre à jour
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    // Mise à jour dans la base de données
    const result = await updateEmplacementModel(id, updateData);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Emplacement non trouvé' });
    }

    // Récupération de la version mise à jour pour la réponse
    const updatedEmplacement = await getEmplacementById(id);
    
    res.json({ 
      message: 'Emplacement mis à jour avec succès',
      data: updatedEmplacement
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de l\'emplacement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Supprimer un emplacement
export const deleteEmplacement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteEmplacementModel(id);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Emplacement non trouvé' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Emplacement et réservations associées supprimés avec succès',
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error('Erreur suppression emplacement:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la suppression',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtenir les noms de tous les emplacements
export const fetchEmplacementNames = async (req, res) => {
  try {
    const names = await getEmplacementNames();
    res.json(names);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des noms des emplacements' });
  }
};

// Obtenir les types d'emplacements
export const fetchEmplacementTypes = async (req, res) => {
  try {
    const types = await getEmplacementTypes();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des types d\'emplacements' });
  }
};