import * as prospectModel from '../models/prospectModel.js';

// Créer un prospect
export const createProspect = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, source, actionId } = req.body;
    const newProspect = await prospectModel.createProspect(nom, prenom, email, telephone, source, actionId);
    res.status(201).json(newProspect);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupérer tous les prospects
export const getAllProspects = async (req, res) => {
  try {
    const prospects = await prospectModel.getAllProspects();
    res.status(200).json(prospects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mettre à jour un prospect
export const updateProspect = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, email, telephone, source, actionId } = req.body;
    const updatedProspect = await prospectModel.updateProspect(id, { nom, prenom, email, telephone, source, actionId });
    res.status(200).json(updatedProspect);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mettre à jour l'action d'un prospect
export const updateProspectAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { actionId } = req.body;
    const updatedProspect = await prospectModel.updateProspectAction(id, actionId);
    res.status(200).json(updatedProspect);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupérer le nombre total de prospects
export const getTotalProspects = async (req, res) => {
  try {
    const total = await prospectModel.countProspects();
    res.status(200).json({ total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupérer les 5 derniers prospects
export const getLastFiveProspects = async (req, res) => {
  try {
    const lastFive = await prospectModel.getLastFiveProspects();
    res.status(200).json(lastFive);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupérer les prospects avec leurs actions
export const getProspectsWithActions = async (req, res) => {
  try {
    const prospectsWithActions = await prospectModel.getProspectsWithActions();
    res.status(200).json(prospectsWithActions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Supprimer un prospect
export const deleteProspect = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProspect = await prospectModel.deleteProspect(id);
    res.status(200).json({ message: `Prospect with id ${id} has been deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
