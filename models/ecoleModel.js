import pool from '../config/db.js';

// Récupérer toutes les écoles
export const getEcoles = async () => {
  const [rows] = await pool.query('SELECT * FROM ecoles');
  return rows;
};

// Récupérer une école par ID
export const getEcoleById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM ecoles WHERE id = ?', [id]);
  return rows[0];
};

// Créer une nouvelle école
export const createEcole = async (ecole) => {
  const { nom, emplacement, coach } = ecole;
  
  const [result] = await pool.query(
    `INSERT INTO ecoles 
    (nom) 
    VALUES (?)`,
    [nom]
  );
  return result.insertId;
};

// Mettre à jour une école
export const updateEcole = async (id, ecole) => {
  const { nom, emplacement, coach, status } = ecole;
  
  const [result] = await pool.query(
    `UPDATE ecoles 
    SET nom = ?
    WHERE id = ?`,
    [nom, id]
  );
  return result;
};

// Supprimer une école
export const deleteEcole = async (id) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // D'abord supprimer les relations dans les tables de jointure
    await connection.query('DELETE FROM ecole_emplacement WHERE ecole_id = ?', [id]);
    await connection.query('DELETE FROM ecole_coach WHERE ecole_id = ?', [id]);
    
    // Puis supprimer l'école elle-même
    const [result] = await connection.query('DELETE FROM ecoles WHERE id = ?', [id]);
    
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Récupérer les noms de toutes les écoles
export const getEcoleNames = async () => {
  const [rows] = await pool.query('SELECT nom FROM ecoles');
  return rows.map(row => row.nom);
};



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Ajoutez ces nouvelles fonctions au model
export const getEcoleEmplacements = async (ecoleId) => {
  const [rows] = await pool.query(`
    SELECT e.* FROM emplacements e
    JOIN ecole_emplacement ee ON e.id = ee.emplacement_id
    WHERE ee.ecole_id = ?
  `, [ecoleId]);
  return rows;
};

export const addEmplacementsToEcole = async (ecoleId, emplacementIds) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Supprimer d'abord les anciennes associations si nécessaire
    await connection.query('DELETE FROM ecole_emplacement WHERE ecole_id = ?', [ecoleId]);
    
    // Ajouter les nouvelles associations
    for (const empId of emplacementIds) {
      await connection.query(
        'INSERT INTO ecole_emplacement (ecole_id, emplacement_id) VALUES (?, ?)',
        [ecoleId, empId]
      );
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateEmplacementsForEcole = async (ecoleId, emplacementIds) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Supprimer toutes les associations existantes
    await connection.query('DELETE FROM ecole_emplacement WHERE ecole_id = ?', [ecoleId]);
    
    // Ajouter les nouvelles associations
    for (const empId of emplacementIds) {
      await connection.query(
        'INSERT INTO ecole_emplacement (ecole_id, emplacement_id) VALUES (?, ?)',
        [ecoleId, empId]
      );
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};


// Ajoutez ces nouvelles fonctions de modèle coach
export const getEcoleCoaches = async (ecoleId) => {
  const [rows] = await pool.query(`
    SELECT c.* FROM coaches c
    JOIN ecole_coach ec ON c.id = ec.coach_id
    WHERE ec.ecole_id = ?
  `, [ecoleId]);
  return rows;
};

export const addCoachesToEcole = async (ecoleId, coachIds) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Ajouter les nouvelles associations
    for (const coachId of coachIds) {
      await connection.query(
        'INSERT INTO ecole_coach (ecole_id, coach_id) VALUES (?, ?)',
        [ecoleId, coachId]
      );
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateCoachesForEcole = async (ecoleId, coachIds) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Supprimer toutes les associations existantes
    await connection.query('DELETE FROM ecole_coach WHERE ecole_id = ?', [ecoleId]);
    
    // Ajouter les nouvelles associations
    for (const coachId of coachIds) {
      await connection.query(
        'INSERT INTO ecole_coach (ecole_id, coach_id) VALUES (?, ?)',
        [ecoleId, coachId]
      );
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};