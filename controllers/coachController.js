// controllers/coachController.js
import Coach from '../models/coachModel.js';

// Créer un coach
export const createCoach = async (req, res) => {
  const { nom, prenom, email, phone, password, salary_type, hourly_rate, commission_rate } = req.body;

  try {
    // Vérifier si l'email existe déjà
    const existingCoach = await Coach.findByEmail(email);
    if (existingCoach) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Vérifier la longueur du mot de passe
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    const newCoach = { 
      nom, 
      prenom, 
      email, 
      phone, 
      password, // Mot de passe non crypté
      salary_type, 
      hourly_rate, 
      commission_rate 
    };

    const result = await Coach.create(newCoach);
    return res.status(201).json({ 
      message: 'Coach créé avec succès', 
      coachId: result.insertId 
    });
  } catch (err) {
    return res.status(500).json({ 
      message: 'Erreur lors de la création du coach', 
      error: err.message 
    });
  }
};

// Mettre à jour un coach
export const updateCoach = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, email, phone, password, salary_type, hourly_rate, commission_rate } = req.body;

  try {
    // Si un mot de passe est fourni, vérifier sa longueur
    if (password && password.length < 6) {
      return res.status(400).json({ 
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    const updatedCoach = { 
      nom, 
      prenom, 
      email, 
      phone, 
      password, // Mot de passe non crypté
      salary_type, 
      hourly_rate, 
      commission_rate 
    };

    const result = await Coach.update(id, updatedCoach);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Coach non trouvé' });
    }
    return res.status(200).json({ message: 'Coach mis à jour avec succès' });
  } catch (err) {
    return res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du coach', 
      error: err.message 
    });
  }
};

// Récupérer tous les coaches
export const getAllCoaches = async (req, res) => {
  try {
    const coaches = await Coach.getAll();
    
    // Ne pas envoyer les mots de passe dans la liste
    const coachesWithoutPassword = coaches.map(coach => {
      const { password, ...coachWithoutPassword } = coach;
      return coachWithoutPassword;
    });
    
    return res.status(200).json(coachesWithoutPassword);
  } catch (err) {
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération des coaches', 
      error: err.message 
    });
  }
};

// Récupérer tous les noms et prénoms des coaches
export const getAllCoachNames = async (req, res) => {
  try {
    const names = await Coach.getAllNames();
    return res.status(200).json(names);
  } catch (err) {
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération des noms des coaches', 
      error: err.message 
    });
  }
};

// Récupérer un coach par ID
export const getCoachById = async (req, res) => {
  const { id } = req.params;
  try {
    const coach = await Coach.getById(id);
    if (!coach) {
      return res.status(404).json({ message: 'Coach non trouvé' });
    }
    
    // Ne pas envoyer le mot de passe
    const { password, ...coachWithoutPassword } = coach;
    
    return res.status(200).json(coachWithoutPassword);
  } catch (err) {
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération du coach', 
      error: err.message 
    });
  }
};

// Calculer le salaire mensuel d'un coach
export const getSalaireMensuel = async (req, res) => {
  const { id, annee, mois } = req.params;

  const cleanedMois = mois.trim().replace(/\n/g, ''); // Retirer les sauts de ligne
  const cleanedAnnee = annee.trim();

  try {
    const salaire = await Coach.calculerSalaireMensuel(id, cleanedAnnee, cleanedMois);
    res.status(200).json({ 
      coachId: id, 
      annee: cleanedAnnee, 
      mois: cleanedMois, 
      salaire 
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Erreur lors du calcul du salaire', 
      error: err.message 
    });
  }
};

// Récupérer les séances par mois avec salaire pour un coach
export const getSeancesByMonth = async (req, res) => {
  const { id, annee } = req.params;

  try {
    const seancesByMonth = await Coach.getSeancesByMonth(id, annee);
    res.status(200).json({ 
      coachId: id, 
      annee, 
      seancesByMonth 
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des séances par mois', 
      error: err.message 
    });
  }
};

// Supprimer un coach
export const deleteCoach = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Coach.delete(id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Coach non trouvé' });
    }
    return res.status(200).json({ message: 'Coach supprimé avec succès' });
  } catch (err) {
    return res.status(500).json({ 
      message: 'Erreur lors de la suppression du coach', 
      error: err.message 
    });
  }
};