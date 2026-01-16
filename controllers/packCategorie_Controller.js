import PackCategorie from '../models/packCategorie_Model.js';

const packCategorie_Controller = {
  // Récupérer toutes les catégories
  getAllPackCategories: async (req, res) => {
    try {
      const categories = await PackCategorie.getAll();
      res.json({
        success: true,
        data: categories,
        message: 'Catégories récupérées avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération des catégories',
        error: error.message
      });
    }
  },

  // Récupérer une catégorie par ID
  getPackCategoryById: async (req, res) => {
    try {
      const { id } = req.params;
      const category = await PackCategorie.getById(id);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Catégorie non trouvée'
        });
      }

      res.json({
        success: true,
        data: category,
        message: 'Catégorie récupérée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de la catégorie:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération de la catégorie',
        error: error.message
      });
    }
  },

  // Créer une nouvelle catégorie
  createPackCategory: async (req, res) => {
    try {
      const { 
        nom, 
        tarif, 
        durer_mois, 
        nombre_activiter, 
        nombre_seances, 
        nombre_de_personne, 
        remise, 
        prix_ttc 
      } = req.body;

      // Validation des données
      if (!nom || !tarif || !durer_mois || !nombre_activiter || 
          nombre_seances === undefined || !nombre_de_personne || 
          remise === undefined || !prix_ttc) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs sont requis: nom, tarif, durer_mois, nombre_activiter, nombre_seances, nombre_de_personne, remise, prix_ttc'
        });
      }

      // Validation des valeurs numériques
      if (tarif < 0 || durer_mois <= 0 || nombre_activiter <= 0 || 
          nombre_seances < 0 || nombre_de_personne <= 0 || remise < 0 || remise > 100) {
        return res.status(400).json({
          success: false,
          message: 'Valeurs invalides: vérifiez les valeurs numériques'
        });
      }

      const newCategory = await PackCategorie.create({ 
        nom, 
        tarif: parseFloat(tarif),
        durer_mois: parseInt(durer_mois),
        nombre_activiter: parseInt(nombre_activiter),
        nombre_seances: parseInt(nombre_seances) || 0,
        nombre_de_personne: parseInt(nombre_de_personne),
        remise: parseFloat(remise),
        prix_ttc: parseFloat(prix_ttc)
      });
      
      res.status(201).json({
        success: true,
        data: newCategory,
        message: 'Catégorie créée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la création de la catégorie',
        error: error.message
      });
    }
  },

  // Mettre à jour une catégorie
  updatePackCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        nom, 
        tarif, 
        durer_mois, 
        nombre_activiter, 
        nombre_seances, 
        nombre_de_personne, 
        remise, 
        prix_ttc 
      } = req.body;

      // Vérifier si la catégorie existe
      const existingCategory = await PackCategorie.getById(id);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Catégorie non trouvée'
        });
      }

      // Validation des valeurs numériques
      if (tarif < 0 || durer_mois <= 0 || nombre_activiter <= 0 || 
          nombre_seances < 0 || nombre_de_personne <= 0 || remise < 0 || remise > 100) {
        return res.status(400).json({
          success: false,
          message: 'Valeurs invalides: vérifiez les valeurs numériques'
        });
      }

      const updatedCategory = await PackCategorie.update(id, { 
        nom: nom || existingCategory.nom,
        tarif: tarif !== undefined ? parseFloat(tarif) : existingCategory.tarif,
        durer_mois: durer_mois !== undefined ? parseInt(durer_mois) : existingCategory.durer_mois,
        nombre_activiter: nombre_activiter !== undefined ? parseInt(nombre_activiter) : existingCategory.nombre_activiter,
        nombre_seances: nombre_seances !== undefined ? parseInt(nombre_seances) : existingCategory.nombre_seances,
        nombre_de_personne: nombre_de_personne !== undefined ? parseInt(nombre_de_personne) : existingCategory.nombre_de_personne,
        remise: remise !== undefined ? parseFloat(remise) : existingCategory.remise,
        prix_ttc: prix_ttc !== undefined ? parseFloat(prix_ttc) : existingCategory.prix_ttc
      });
      
      res.json({
        success: true,
        data: updatedCategory,
        message: 'Catégorie mise à jour avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la mise à jour de la catégorie',
        error: error.message
      });
    }
  },

  // Supprimer une catégorie
  deletePackCategory: async (req, res) => {
    try {
      const { id } = req.params;

      // Vérifier si la catégorie existe
      const existingCategory = await PackCategorie.getById(id);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Catégorie non trouvée'
        });
      }

      // Vérifier si la catégorie est utilisée par des packs
      const isUsed = await PackCategorie.isUsedByPacks(id);
      if (isUsed) {
        return res.status(400).json({
          success: false,
          message: 'Cette catégorie est utilisée par un ou plusieurs packs et ne peut pas être supprimée'
        });
      }

      await PackCategorie.delete(id);
      
      res.json({
        success: true,
        message: 'Catégorie supprimée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la suppression de la catégorie',
        error: error.message
      });
    }
  },

  // Rechercher des catégories par nom
  searchPackCategories: async (req, res) => {
    try {
      const { search } = req.query;
      
      if (!search || search.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Le terme de recherche est requis'
        });
      }

      const categories = await PackCategorie.searchByName(search);
      
      res.json({
        success: true,
        data: categories,
        message: 'Recherche effectuée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la recherche des catégories:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la recherche des catégories',
        error: error.message
      });
    }
  },

  // Récupérer les statistiques des catégories
  getPackCategoriesStats: async (req, res) => {
    try {
      const stats = await PackCategorie.getStats();
      
      res.json({
        success: true,
        data: stats,
        message: 'Statistiques récupérées avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération des statistiques',
        error: error.message
      });
    }
  },

  // Récupérer les catégories par durée
  getPackCategoriesByDuration: async (req, res) => {
    try {
      const { duration } = req.params;
      
      if (!duration || isNaN(duration)) {
        return res.status(400).json({
          success: false,
          message: 'La durée doit être un nombre valide'
        });
      }

      const categories = await PackCategorie.getByDuration(parseInt(duration));
      
      res.json({
        success: true,
        data: categories,
        message: 'Catégories récupérées par durée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories par durée:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la récupération des catégories par durée',
        error: error.message
      });
    }
  }
};

export default packCategorie_Controller;