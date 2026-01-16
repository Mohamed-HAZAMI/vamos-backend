import db from '../config/db.js';

const PackCategorie = {
  // Récupérer toutes les catégories
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT * FROM pack_categorie 
      ORDER BY created_at DESC
    `);
    return rows;
  },

  // Récupérer une catégorie par ID
  getById: async (id) => {
    const [rows] = await db.query(
      'SELECT * FROM pack_categorie WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // Créer une nouvelle catégorie
  create: async ({ nom, tarif, durer_mois, nombre_activiter, nombre_seances, nombre_de_personne, remise, prix_ttc }) => {
    const [result] = await db.query(
      `INSERT INTO pack_categorie (nom, tarif, durer_mois, nombre_activiter, nombre_seances, nombre_de_personne, remise, prix_ttc) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, tarif, durer_mois, nombre_activiter, nombre_seances, nombre_de_personne, remise, prix_ttc]
    );
    
    // Retourner la catégorie créée
    const [newCategory] = await db.query(
      'SELECT * FROM pack_categorie WHERE id = ?',
      [result.insertId]
    );
    
    return newCategory[0];
  },

  // Mettre à jour une catégorie
  update: async (id, { nom, tarif, durer_mois, nombre_activiter, nombre_seances, nombre_de_personne, remise, prix_ttc }) => {
    await db.query(
      `UPDATE pack_categorie 
       SET nom = ?, tarif = ?, durer_mois = ?, nombre_activiter = ?, nombre_seances = ?, nombre_de_personne = ?, remise = ?, prix_ttc = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [nom, tarif, durer_mois, nombre_activiter, nombre_seances, nombre_de_personne, remise, prix_ttc, id]
    );
    
    // Retourner la catégorie mise à jour
    const [updatedCategory] = await db.query(
      'SELECT * FROM pack_categorie WHERE id = ?',
      [id]
    );
    
    return updatedCategory[0];
  },

  // Supprimer une catégorie
  delete: async (id) => {
    await db.query(
      'DELETE FROM pack_categorie WHERE id = ?',
      [id]
    );
    
    return true;
  },

  // Vérifier si une catégorie est utilisée par des packs
  isUsedByPacks: async (id) => {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM pack WHERE id_categorie = ?',
      [id]
    );
    return rows[0].count > 0;
  },

  // Rechercher des catégories par nom
  searchByName: async (searchTerm) => {
    const [rows] = await db.query(
      'SELECT * FROM pack_categorie WHERE nom LIKE ? ORDER BY nom',
      [`%${searchTerm}%`]
    );
    return rows;
  },

  // Récupérer les catégories par durée
  getByDuration: async (durer_mois) => {
    const [rows] = await db.query(
      'SELECT * FROM pack_categorie WHERE durer_mois = ? ORDER BY tarif',
      [durer_mois]
    );
    return rows;
  },

  // Statistiques des catégories
  getStats: async () => {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_categories,
        AVG(tarif) as avg_tarif,
        MIN(tarif) as min_tarif,
        MAX(tarif) as max_tarif,
        SUM(nombre_activiter) as total_activites,
        SUM(nombre_seances) as total_seances
      FROM pack_categorie
    `);
    return rows[0];
  }
};

export default PackCategorie;