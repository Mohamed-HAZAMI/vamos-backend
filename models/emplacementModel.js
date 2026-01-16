import pool from '../config/db.js';

// Récupérer tous les emplacements
export const getEmplacements = async () => {
  const [rows] = await pool.query('SELECT * FROM emplacements');
  return rows;
};

// Récupérer un emplacement par ID
export const getEmplacementById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM emplacements WHERE id = ?', [id]);
  return rows[0];
};

// Créer un nouvel emplacement
export const createEmplacement = async (emplacement) => {
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
  } = emplacement;
  
  const [result] = await pool.query(
    `INSERT INTO emplacements 
    (nom, tarif_seance, status, type, nombre_terrains, duree_seance, date_ouverture, date_fermeture, nombre_seances) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nom, tarif_seance, status, type, nombre_terrains, duree_seance, date_ouverture, date_fermeture, nombre_seances]
  );
  return result.insertId;
};

// Mettre à jour un emplacement
export const updateEmplacementModel = async (id, emplacement) => {
  const { 
    nom, 
    tarif_seance, 
    status, 
    type, 
    nombre_terrains, 
    duree_seance, 
    date_ouverture, 
    date_fermeture, 
    nombre_seances 
  } = emplacement;
  
  const [result] = await pool.query(
    `UPDATE emplacements 
    SET nom = ?, 
        tarif_seance = ?, 
        status = ?, 
        type = ?, 
        nombre_terrains = ?, 
        duree_seance = ?, 
        date_ouverture = ?, 
        date_fermeture = ?, 
        nombre_seances = ? 
    WHERE id = ?`,
    [nom, tarif_seance, status, type, nombre_terrains, duree_seance, date_ouverture, date_fermeture, nombre_seances, id]
  );
  return result;
};

// Supprimer un emplacement
export const deleteEmplacementModel = async (id) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. D'abord supprimer les réservations associées
    await connection.query('DELETE FROM reservation WHERE idEmplacement = ?', [id]);
    
    // 2. Ensuite supprimer l'emplacement
    const [result] = await connection.query('DELETE FROM emplacements WHERE id = ?', [id]);
    
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Récupérer les noms de tous les emplacements
export const getEmplacementNames = async () => {
  const [rows] = await pool.query('SELECT nom FROM emplacements');
  return rows.map(row => row.nom);
};

// Récupérer les types uniques
export const getEmplacementTypes = async () => {
  const [rows] = await pool.query('SELECT DISTINCT type FROM emplacements');
  return rows.map(row => row.type);
};