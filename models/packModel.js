import db from '../config/db.js';

const Pack = {
  getAll: async () => {
    const [rows] = await db.query('SELECT * FROM packs');
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM packs WHERE id = ?', [id]);
    return rows[0];
  },

  create: async (data) => {
    const [result] = await db.query('INSERT INTO packs (nom, prix) VALUES (?, ?)', [data.nom, data.prix]);
    return result.insertId;
  },

  update: async (id, data) => {
    await db.query('UPDATE packs SET nom = ?, prix = ? WHERE id = ?', [data.nom, data.prix, id]);
  },

  delete: async (id) => {
    await db.query('DELETE FROM packs WHERE id = ?', [id]);
  },

  getAllPackNames: async () => {
    const [rows] = await db.query('SELECT nom FROM packs');
    return rows.map(row => row.nom);
  },
};

export default Pack;
