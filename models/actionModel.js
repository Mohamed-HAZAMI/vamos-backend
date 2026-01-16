import pool from '../config/db.js'; // Utilisation de pool pour la connexion à MySQL

// Récupérer toutes les actions
export const getAllActions = async () => {
  const [rows] = await pool.execute('SELECT * FROM actions'); // Utilisation de pool.execute au lieu de db.execute
  return rows;
};
