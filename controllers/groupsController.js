import Group from '../models/groupsModel.js';

// Créer un groupe
export const createGroup = async (req, res) => {
  try {
    const { nom, description, ecole_id, coachIds, adherentIds, emplacementIds } = req.body;

    // Validation minimale
    if (!nom || !ecole_id) {
      return res.status(400).json({ message: "Le nom et l'école sont obligatoires" });
    }

    // Création du groupe
    const groupId = await Group.create(nom, description, ecole_id);

    // Associations en parallèle
    await Promise.all([
      coachIds?.length > 0 && Group.updateGroupCoaches(groupId, coachIds),
      adherentIds?.length > 0 && Group.updateGroupAdherents(groupId, adherentIds),
      emplacementIds?.length > 0 && Group.updateGroupEmplacements(groupId, emplacementIds)
    ]);

    // Récupération complète du groupe créé
    const groupWithRelations = await getFullGroupDetails(groupId);

    res.status(201).json({
      ...groupWithRelations,
      message: "Groupe créé avec succès"
    });

  } catch (error) {
    console.error("Erreur création groupe:", error);
    res.status(500).json({ 
      message: "Erreur serveur",
      error: error.message 
    });
  }
};

// Récupérer tous les groupes
export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.findAll();
    
    // Récupération des relations pour chaque groupe
    const groupsWithRelations = await Promise.all(
      groups.map(group => getFullGroupDetails(group.id))
    );

    res.json(groupsWithRelations);
  } catch (error) {
    console.error("Erreur récupération groupes:", error);
    res.status(500).json({ message: error.message });
  }
};

// Récupérer un groupe spécifique
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    const groupWithRelations = await getFullGroupDetails(req.params.id);
    res.json(groupWithRelations);

  } catch (error) {
    console.error("Erreur récupération groupe:", error);
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour un groupe
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, coachIds, adherentIds, emplacementIds } = req.body;

    await Group.update(id, nom, description);

    // Mise à jour optionnelle des relations
    await Promise.all([
      coachIds && Group.updateGroupCoaches(id, coachIds),
      adherentIds && Group.updateGroupAdherents(id, adherentIds),
      emplacementIds && Group.updateGroupEmplacements(id, emplacementIds)
    ]);

    const updatedGroup = await getFullGroupDetails(id);
    res.json({
      ...updatedGroup,
      message: 'Groupe mis à jour avec succès'
    });

  } catch (error) {
    console.error("Erreur mise à jour groupe:", error);
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un groupe
export const deleteGroup = async (req, res) => {
  try {
    await Group.delete(req.params.id);
    res.json({ message: 'Groupe supprimé avec succès' });
  } catch (error) {
    console.error("Erreur suppression groupe:", error);
    res.status(500).json({ message: error.message });
  }
};

// Gestion spécifique des coaches
export const updateGroupCoaches = async (req, res) => {
  try {
    const { coachIds } = req.body;
    await Group.updateGroupCoaches(req.params.id, coachIds);
    
    const coaches = await Group.getGroupCoaches(req.params.id);
    res.json({ 
      message: 'Coaches du groupe mis à jour',
      coaches 
    });
  } catch (error) {
    console.error("Erreur mise à jour coaches:", error);
    res.status(500).json({ message: error.message });
  }
};

// Gestion spécifique des adhérents
export const updateGroupAdherents = async (req, res) => {
  try {
    const { adherentIds } = req.body;
    await Group.updateGroupAdherents(req.params.id, adherentIds);
    
    const adherents = await Group.getGroupAdherents(req.params.id);
    res.json({ 
      message: 'Adhérents du groupe mis à jour',
      adherents 
    });
  } catch (error) {
    console.error("Erreur mise à jour adhérents:", error);
    res.status(500).json({ message: error.message });
  }
};

// Gestion spécifique des emplacements
export const updateGroupEmplacements = async (req, res) => {
  try {
    const { emplacementIds } = req.body;
    await Group.updateGroupEmplacements(req.params.id, emplacementIds);
    
    const emplacements = await Group.getGroupEmplacements(req.params.id);
    res.json({ 
      message: 'Emplacements du groupe mis à jour',
      emplacements 
    });
  } catch (error) {
    console.error("Erreur mise à jour emplacements:", error);
    res.status(500).json({ message: error.message });
  }
};

// Fonction utilitaire pour récupérer un groupe avec toutes ses relations
async function getFullGroupDetails(groupId) {
  const [group, coaches, adherents, emplacements] = await Promise.all([
    Group.findById(groupId),
    Group.getGroupCoaches(groupId),
    Group.getGroupAdherents(groupId),
    Group.getGroupEmplacements(groupId)
  ]);

  return {
    ...group,
    coaches,
    adherents,
    emplacements
  };
}