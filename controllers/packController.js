import Pack from '../models/packModel.js';
import db from '../config/db.js';

const getAllPacks = async (req, res) => {
  try {
    const packs = await Pack.getAll();
    res.json(packs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPackById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid pack ID' });
    }
    const pack = await Pack.getById(id);
    if (!pack) return res.status(404).json({ message: 'Pack not found' });
    res.json(pack);
  } catch (err) {
    console.error('Error in getPackById:', err);
    res.status(500).json({ error: err.message });
  }
};

const createPack = async (req, res) => {
  try {
    const id = await Pack.create(req.body);
    res.status(201).json({ message: 'Pack created', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updatePack = async (req, res) => {
  try {
    await Pack.update(req.params.id, req.body);
    res.json({ message: 'Pack updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deletePack = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid pack ID' });
    }
    const [abonnements] = await db.query('SELECT id FROM Abonnements WHERE packId = ?', [id]);
    if (abonnements.length > 0) {
      return res.status(400).json({ message: 'Cannot delete pack: It is referenced in existing subscriptions' });
    }
    await Pack.delete(id);
    res.json({ message: 'Pack deleted' });
  } catch (err) {
    console.error('Error in deletePack:', err);
    res.status(500).json({ error: err.message });
  }
};

const getPackNames = async (req, res) => {
  try {
    const packNames = await Pack.getAllPackNames();
    res.json(packNames);
  } catch (err) {
    console.error('Error in getPackNames:', err);
    res.status(500).json({ error: err.message });
  }
};

export default {
  getAllPacks,
  getPackById,
  createPack,
  updatePack,
  deletePack,
  getPackNames
};