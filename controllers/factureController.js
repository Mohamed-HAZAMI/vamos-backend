import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import sanitizePath from 'sanitize-filename';
import pool from '../config/db.js'; // Import the MySQL connection pool
import {
  createFacture,
  getFactureById,
  updateFactureStatus,
  checkNumeroFacture,
  updateFacturePaymentMethod,
} from '../models/factureModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getFacturePDFHandler = async (req, res) => {
  try {
    const { chemin_pdf } = req.params;
    const sanitizedFileName = sanitizePath(chemin_pdf);
    if (!sanitizedFileName) {
      console.error(`Invalid filename provided: ${chemin_pdf}`);
      return res.status(400).json({ message: 'Nom de fichier invalide' });
    }

    const [rows] = await pool.query(
      `SELECT id FROM factures WHERE chemin_pdf = ?`,
      [sanitizedFileName]
    );
    if (rows.length === 0) {
      console.error(`No invoice found for chemin_pdf: ${sanitizedFileName}`);
      return res.status(404).json({ message: 'Aucune facture associée à ce fichier PDF' });
    }

    const filePath = path.join(__dirname, '..', 'pdfs', sanitizedFileName);

    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch (err) {
      console.error(`File not found or inaccessible at ${filePath}:`, err);
      return res.status(404).json({ message: 'Fichier PDF introuvable ou inaccessible' });
    }

    if (!filePath.toLowerCase().endsWith('.pdf')) {
      console.error(`Invalid file extension for: ${filePath}`);
      return res.status(400).json({ message: 'Le fichier n\'est pas un PDF valide' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error sending file ${filePath}:`, err);
        return res.status(500).json({ message: 'Erreur lors de l\'envoi du fichier PDF' });
      }
    });
  } catch (err) {
    console.error('Unexpected error in getFacturePDFHandler:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du PDF' });
  }
};

export const createFactureHandler = async (req, res) => {
  try {
    const factureData = req.body;
    const result = await createFacture(factureData);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error in createFactureHandler:', err.message);
    res.status(400).json({ message: err.message });
  }
};

export const getFacture = async (req, res) => {
  try {
    const facture = await getFactureById(req.params.id);
    res.status(200).json(facture);
  } catch (err) {
    console.error('Error in getFacture:', err.message);
    res.status(404).json({ message: err.message });
  }
};

export const updateFactureStatusHandler = async (req, res) => {
  try {
    const { statut } = req.body;
    await updateFactureStatus(req.params.id, statut);
    res.status(200).json({ message: 'Statut mis à jour' });
  } catch (err) {
    console.error('Error in updateFactureStatusHandler:', err.message);
    res.status(400).json({ message: err.message });
  }
};

export const checkNumeroFactureHandler = async (req, res) => {
  try {
    const { numero } = req.params;
    const result = await checkNumeroFacture(numero);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in checkNumeroFactureHandler:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export const updateFacturePaymentMethodHandler = async (req, res) => {
  try {
    const { mode_paiement } = req.body;
    await updateFacturePaymentMethod(req.params.id, mode_paiement);
    res.status(200).json({ message: 'Mode de paiement mis à jour' });
  } catch (err) {
    console.error('Error in updateFacturePaymentMethodHandler:', err.message);
    res.status(400).json({ message: err.message });
  }
};