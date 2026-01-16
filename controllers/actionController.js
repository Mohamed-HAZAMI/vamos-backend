import { getAllActions } from '../models/actionModel.js';

// Récupérer toutes les actions
export const getActions = async (req, res) => {
  try {
    const actions = await getAllActions();
    res.status(200).json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
