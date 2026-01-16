import {
  getEcoles,
  getEcoleById,
  createEcole,
  updateEcole as updateEcoleModel,
  deleteEcole as deleteEcoleModel,
  getEcoleNames,
  addEmplacementsToEcole,
  getEcoleEmplacements,
  updateEmplacementsForEcole,
  getEcoleCoaches,
  addCoachesToEcole,
  updateCoachesForEcole
} from '../models/ecoleModel.js';

// Fetch all schools
export const fetchEcoles = async (req, res) => {
  try {
      const ecoles = await getEcoles();
      res.status(200).json(ecoles);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

// Get single school
export const fetchEcoleById = async (req, res) => {
  const { id } = req.params;
  try {
      const ecole = await getEcoleById(id);
      ecole ? res.status(200).json(ecole) : res.status(404).json({ message: 'École non trouvée' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

// Create school
export const addEcole = async (req, res) => {
  const { nom } = req.body;
  try {
      const newEcoleId = await createEcole({ nom });
      res.status(201).json({ id: newEcoleId, message: 'École créée avec succès' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

// Update school
export const updateEcole = async (req, res) => {
  const { id } = req.params;
  const { nom } = req.body;
  try {
      await updateEcoleModel(id, { nom });
      res.status(200).json({ message: 'École mise à jour avec succès' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

// Delete school
export const deleteEcole = async (req, res) => {
  const { id } = req.params;
  try {
      await deleteEcoleModel(id);
      res.status(200).json({ message: 'École supprimée avec succès' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

// Get school names
export const fetchEcoleNames = async (req, res) => {
  try {
      const names = await getEcoleNames();
      res.status(200).json(names);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

// Emplacement-related controllers
export const fetchEcoleEmplacements = async (req, res) => {
  const { id } = req.params;
  try {
      const emplacements = await getEcoleEmplacements(id);
      res.status(200).json(emplacements);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

export const addEcoleEmplacements = async (req, res) => {
  const { id } = req.params;
  const { emplacements } = req.body;
  try {
      if (!emplacements || !Array.isArray(emplacements)) {
          return res.status(400).json({ message: 'Liste d\'emplacements invalide' });
      }
      await addEmplacementsToEcole(id, emplacements);
      res.status(200).json({ message: 'Emplacements ajoutés avec succès' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

export const updateEcoleEmplacements = async (req, res) => {
  const { id } = req.params;
  const { emplacements } = req.body;
  try {
      if (!emplacements || !Array.isArray(emplacements)) {
          return res.status(400).json({ message: 'Liste d\'emplacements invalide' });
      }
      await updateEmplacementsForEcole(id, emplacements);
      res.status(200).json({ message: 'Emplacements mis à jour avec succès' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

// Coach-related controllers
export const fetchEcoleCoaches = async (req, res) => {
  const { id } = req.params;
  try {
      const coaches = await getEcoleCoaches(id);
      res.status(200).json(coaches);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

export const addEcoleCoaches = async (req, res) => {
  const { id } = req.params;
  const { coaches } = req.body;
  try {
      if (!coaches || !Array.isArray(coaches)) {
          return res.status(400).json({ message: 'Liste de coaches invalide' });
      }
      await addCoachesToEcole(id, coaches);
      res.status(200).json({ message: 'Coaches ajoutés avec succès' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

export const updateEcoleCoaches = async (req, res) => {
  const { id } = req.params;
  const { coaches } = req.body;
  try {
      if (!coaches || !Array.isArray(coaches)) {
          return res.status(400).json({ message: 'Liste de coaches invalide' });
      }
      await updateCoachesForEcole(id, coaches);
      res.status(200).json({ message: 'Coaches mis à jour avec succès' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};