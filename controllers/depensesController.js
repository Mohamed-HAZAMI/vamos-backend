import db from '../config/db.js';

// Récupérer toutes les dépenses
export const fetchDepenses = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM depenses';
    let params = [];
    
    if (start_date && end_date) {
      query += ' WHERE DATE(created_at) BETWEEN ? AND ? ORDER BY created_at DESC';
      params = [start_date, end_date];
    } else if (start_date) {
      query += ' WHERE DATE(created_at) >= ? ORDER BY created_at DESC';
      params = [start_date];
    } else if (end_date) {
      query += ' WHERE DATE(created_at) <= ? ORDER BY created_at DESC';
      params = [end_date];
    } else {
      query += ' ORDER BY created_at DESC';
    }
    
    const [depenses] = await db.execute(query, params);
    res.status(200).json(depenses);
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des dépenses' });
  }
};

// Créer une nouvelle dépense (MODIFIÉ pour accepter created_at depuis le frontend)
export const createDepense = async (req, res) => {
  const { montant, description, created_at } = req.body;

  // Validation du montant
  if (!montant || isNaN(montant) || parseFloat(montant) <= 0) {
    return res.status(400).json({ 
      message: 'Le montant est requis et doit être un nombre positif' 
    });
  }

  // Validation de la description
  if (!description || description.trim() === '') {
    return res.status(400).json({ 
      message: 'La description est requise' 
    });
  }

  // Validation de la date (optionnelle - si non fournie, utiliser la date actuelle)
  let dateCreation;
  if (created_at) {
    // Valider que la date est au format valide
    const date = new Date(created_at);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ 
        message: 'La date fournie est invalide' 
      });
    }
    dateCreation = created_at;
  } else {
    // Utiliser la date actuelle si non fournie
    dateCreation = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  try {
    const montantNum = parseFloat(montant);
    const descriptionClean = description.trim();
    
    // Insérer la dépense dans la base de données avec la date fournie
    const [result] = await db.execute(
      'INSERT INTO depenses (montant, description, created_at) VALUES (?, ?, ?)',
      [montantNum, descriptionClean, dateCreation]
    );

    // Récupérer la dépense créée
    const [newDepense] = await db.execute(
      'SELECT * FROM depenses WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Dépense créée avec succès',
      depense: newDepense[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création de la dépense:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la création de la dépense' 
    });
  }
};

// Récupérer la somme totale des dépenses avec filtrage par période
export const getTotalDepenses = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = 'SELECT SUM(montant) as total_depenses FROM depenses';
    let params = [];
    
    if (start_date && end_date) {
      query += ' WHERE DATE(created_at) BETWEEN ? AND ?';
      params = [start_date, end_date];
    } else if (start_date) {
      query += ' WHERE DATE(created_at) >= ?';
      params = [start_date];
    } else if (end_date) {
      query += ' WHERE DATE(created_at) <= ?';
      params = [end_date];
    }
    
    const [result] = await db.execute(query, params);
    const total = result[0].total_depenses || 0;
    
    res.status(200).json({
      total_depenses: parseFloat(total)
    });
  } catch (error) {
    console.error('Erreur lors du calcul du total des dépenses:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors du calcul du total des dépenses' 
    });
  }
};

// Version alternative avec filtrage par période
export const getTotalDepensesByPeriod = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = 'SELECT SUM(montant) as total_depenses FROM depenses';
    let params = [];
    
    if (start_date && end_date) {
      query += ' WHERE DATE(created_at) BETWEEN ? AND ?';
      params = [start_date, end_date];
    } else if (start_date) {
      query += ' WHERE DATE(created_at) >= ?';
      params = [start_date];
    } else if (end_date) {
      query += ' WHERE DATE(created_at) <= ?';
      params = [end_date];
    }
    
    const [result] = await db.execute(query, params);
    
    const total = result[0].total_depenses || 0;
    
    res.status(200).json({
      total_depenses: parseFloat(total),
      periode: start_date && end_date ? `${start_date} to ${end_date}` : 'all'
    });
  } catch (error) {
    console.error('Erreur lors du calcul du total des dépenses par période:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors du calcul du total des dépenses par période' 
    });
  }
};