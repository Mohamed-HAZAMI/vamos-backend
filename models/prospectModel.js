import pool from '../config/db.js';  // Connexion à MySQL via pool

// Récupérer tous les prospects
export const getAllProspects = async () => {
  const [rows] = await pool.execute('SELECT * FROM prospects');
  return rows;
};

// Créer un prospect
export const createProspect = async (nom, prenom, email, telephone, source, actionId) => {
  const [result] = await pool.execute(
    'INSERT INTO prospects (nom, prenom, email, telephone, source, actionId) VALUES (?, ?, ?, ?, ?, ?)',
    [nom, prenom, email, telephone, source, actionId]
  );
  const [prospect] = await pool.execute('SELECT * FROM prospects WHERE id = ?', [result.insertId]);
  return prospect[0];
};

// Mettre à jour un prospect
export const updateProspect = async (id, { nom, prenom, email, telephone, source, actionId }) => {
  const [result] = await pool.execute(
    'UPDATE prospects SET nom = ?, prenom = ?, email = ?, telephone = ?, source = ?, actionId = ? WHERE id = ?',
    [nom, prenom, email, telephone, source, actionId, id]
  );
  if (result.affectedRows === 0) throw new Error('Prospect not found');
  const [updatedProspect] = await pool.execute('SELECT * FROM prospects WHERE id = ?', [id]);
  return updatedProspect[0];
};

// Supprimer un prospect
export const deleteProspect = async (id) => {
  const [result] = await pool.execute('DELETE FROM prospects WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new Error('Prospect not found');
  return { message: 'Prospect deleted successfully' };
};

// Mettre à jour l'action d'un prospect
export const updateProspectAction = async (id, actionId) => {
  const [result] = await pool.execute(
    'UPDATE prospects SET actionId = ? WHERE id = ?',
    [actionId, id]
  );
  if (result.affectedRows === 0) throw new Error('Prospect not found');
  const [updatedProspect] = await pool.execute('SELECT * FROM prospects WHERE id = ?', [id]);
  return updatedProspect[0];
};

// Compter le nombre total de prospects
export const countProspects = async () => {
  const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM prospects');
  return rows[0].total;
};

// Récupérer les 5 derniers prospects
export const getLastFiveProspects = async () => {
  const [rows] = await pool.execute('SELECT * FROM prospects ORDER BY id DESC LIMIT 5');
  return rows;
};

// Récupérer les prospects avec leurs actions
export const getProspectsWithActions = async () => {
  const [rows] = await pool.execute(`
    SELECT 
      p.id, p.nom, p.prenom, p.email, p.telephone, p.source, 
      a.id AS actionId, a.label AS actionLabel
    FROM prospects p
    INNER JOIN actions a ON p.actionId = a.id
  `);
  return rows;
};
