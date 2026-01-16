import pool from "../config/db.js";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sanitizePath from 'sanitize-filename';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const generateInvoiceNumber = () => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`; // Fixed template literal syntax
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `INV-${dateStr}-${randomNum}`; // Fixed template literal syntax
};

// Reusable function to draw tables
const drawTable = (doc, headers, rows, x, y, columnWidths, rowHeight = 20) => {
  const tableLeft = x;
  let currentY = y;

  // Draw header
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333');
  headers.forEach((header, i) => {
    doc.text(header.text, tableLeft + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY, {
      width: columnWidths[i],
      align: header.align || 'left',
    });
  });
  currentY += 15;
  doc.moveTo(tableLeft, currentY).lineTo(tableLeft + columnWidths.reduce((a, b) => a + b, 0), currentY).stroke();

  // Draw rows
  doc.font('Helvetica').fontSize(10);
  rows.forEach((row, rowIndex) => {
    // Alternating row background
    if (rowIndex % 2 === 0) {
      doc.rect(tableLeft, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight)
         .fillOpacity(0.1)
         .fill('#E0E0E0')
         .fillOpacity(1);
    }
    row.forEach((cell, i) => {
      doc.fillColor('#000000').text(cell || '-', tableLeft + columnWidths.slice(0, i).reduce((a, b) => a + b, 0) + 5, currentY + 5, {
        width: columnWidths[i] - 10,
        align: headers[i].align || 'left',
      });
    });
    currentY += rowHeight;
  });
  doc.moveTo(tableLeft, currentY).lineTo(tableLeft + columnWidths.reduce((a, b) => a + b, 0), currentY).stroke();
  return currentY;
};

const generatePDF = async (facture, reservations = [], abonnement = null, seance = null) => {
  if (!facture.numero_facture || typeof facture.numero_facture !== 'string') {
    console.error('Invalid or missing numero_facture:', facture.numero_facture);
    throw new Error('Numéro de facture invalide ou manquant');
  }

  const pdfFileName = `facture_${sanitizePath(facture.numero_facture)}.pdf`; // Fixed template literal syntax
  const pdfDir = path.join(__dirname, '..', 'pdfs');
  await fsPromises.mkdir(pdfDir, { recursive: true });
  const filePath = path.join(pdfDir, pdfFileName);

  const doc = new PDFDocument({ margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);


  // Header
  doc.font('Helvetica-Bold').fontSize(24).fillColor('#2C3E50').text('Club Vamos Sport', 40, 40);
  doc.font('Helvetica').fontSize(10).fillColor('#34495E');
  doc.text('Route de Teniour km 8, Sfax', 40, 70);
  doc.text('Tél: +216 98 510 150', 40, 85);
  doc.text('Email: contact@vamosSport.com', 40, 100);
  doc.moveTo(40, 120).lineTo(570, 120).stroke('#BDC3C7');

  // Invoice Title
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#2C3E50').text(`Facture n° ${facture.numero_facture}`, 400, 40, { align: 'right' }); // Fixed template literal syntax

  // General Information Section
  doc.font('Helvetica-Bold').fontSize(18).text('Informations Générales', 40, 140);
  doc.moveTo(40, 160).lineTo(570, 160).stroke('#BDC3C7');
  doc.font('Helvetica').fontSize(12);
  let adherent_nom = facture.adherent_nom || 'N/A';

  if (reservations.length > 0 && (reservations[0].adherent_nom || reservations[0].clientName)) {
    adherent_nom = reservations[0].adherent_nom || reservations[0].clientName;
  } else if (abonnement?.adherent_nom) {
    // For abonnements, pick the first adherent name if there are multiple
    adherent_nom = abonnement.adherent_nom ? abonnement.adherent_nom.split(', ')[0] : 'N/A';
  } else if (seance?.adherent_nom) {
    adherent_nom = seance.adherent_nom;
  }

  const infoItems = [
    { label: 'Numéro de Facture:', value: facture.numero_facture },
    { label: 'Adhérent:', value: adherent_nom },
    { label: 'Statut:', value: facture.statut || 'en attente' },
    { label: 'Date de Création:', value: facture.date_creation ? new Date(facture.date_creation).toLocaleDateString('fr-FR') : '-' },
    { label: 'Date d\'Échéance:', value: facture.date_echeance ? new Date(facture.date_echeance).toLocaleDateString('fr-FR') : '-' },
    { label: 'Mode de Paiement:', value: facture.mode_paiement || 'non défini' },
  ];

  let currentY = 170;
  infoItems.forEach(item => {
    doc.font('Helvetica-Bold').text(item.label, 40, currentY);
    doc.font('Helvetica').text(item.value, 150, currentY);
    currentY += 20;
  });
  currentY += 10;
  doc.moveTo(40, currentY).lineTo(570, currentY).stroke('#BDC3C7');
  currentY += 20;

  // Montants Section
  doc.font('Helvetica-Bold').fontSize(18).text('Montants', 40, currentY);
  currentY += 20;
  const montantHeaders = [
    { text: 'Description', align: 'left' },
    { text: 'Montant', align: 'right' },
  ];
  const montantRows = [
    ['Montant HT', `${Number(facture.montant_ht).toFixed(2)} TND`],
    [`TVA (${facture.taux_tva}%)`, `${Number(facture.montant_tva).toFixed(2)} TND`],
    ['Montant Total', `${Number(facture.montant_total).toFixed(2)} TND`],
  ];
  currentY = drawTable(doc, montantHeaders, montantRows, 40, currentY, [400, 130], 20);
  currentY += 20;

  // Description Section
  doc.font('Helvetica-Bold').fontSize(18).text('Description', 40, currentY);
  currentY += 20;
  doc.font('Helvetica').fontSize(12).text(facture.description || 'Aucune description', 40, currentY, { width: 530 });
  currentY = doc.y + 20;
  doc.moveTo(40, currentY).lineTo(570, currentY).stroke('#BDC3C7');
  currentY += 20;

  // Render all applicable sections
  if (reservations.length > 0) {
   
    doc.font('Helvetica-Bold').fontSize(18).text('Réservation Associée', 40, currentY);
    currentY += 20;
    const reservationHeaders = [
      { text: 'ID Réservation', align: 'left' },
      { text: 'Nom', align: 'left' },
      { text: 'Dates et Heures', align: 'left' },
      { text: 'Prix', align: 'right' },
      { text: 'Statut', align: 'left' },
      { text: 'Cours', align: 'left' },
      { text: 'Coach', align: 'left' },
    ];
    const reservationRows = reservations.map(res => [
      res.id || '-',
      res.clientName || '-',
      res.date && res.start_time && res.end_time
        ? `${new Date(res.date).toLocaleDateString('fr-FR')} ${res.start_time.slice(0, 5)} - ${res.end_time.slice(0, 5)}` // Fixed template literal syntax
        : '-',
      res.prix ? `${Number(res.prix).toFixed(2)} Tබ TND` : '-', // Fixed template literal syntax
      res.status || '-',
      'N/A',
      'N/A',
    ]);
    currentY = drawTable(doc, reservationHeaders, reservationRows, 40, currentY, [60, 80, 120, 80, 80, 80, 80], 20);
    currentY += 20;
  }

  if (seance) {
    doc.font('Helvetica-Bold').fontSize(18).text('Séance Associée', 40, currentY);
    currentY += 20;
    const seanceHeaders = [
      { text: 'Nom', align: 'left' },
      { text: 'Date', align: 'left' },
      { text: 'Heures', align: 'left' },
      { text: 'Cours', align: 'left' },
      { text: 'Coach', align: 'left' },
    ];
    const seanceRows = [[
      seance.nom || '-',
      seance.dateSeance ? new Date(seance.dateSeance).toLocaleDateString('fr-FR') : '-',
      seance.heureDebut && seance.heureFin ? `${seance.heureDebut.slice(0, 5)} - ${seance.heureFin.slice(0, 5)}` : '-', // Fixed template literal syntax
      seance.cours_nom || 'Aucun cours',
      seance.coach_nom || '-',
    ]];
    currentY = drawTable(doc, seanceHeaders, seanceRows, 40, currentY, [110, 110, 110, 110, 110], 20);
    currentY += 20;
  }

  if (abonnement) {
    doc.font('Helvetica-Bold').fontSize(18).text('Abonnement Associé', 40, currentY);
    currentY += 20;
    const abonnementHeaders = [
      { text: 'ID Abonnement', align: 'left' },
      { text: 'Adhérents', align: 'left' },
      { text: 'Cours', align: 'left' },
      { text: 'Dates', align: 'left' },
      { text: 'Pack', align: 'left' },
      { text: 'Prix', align: 'right' },
    ];
    const abonnementRows = [[
      abonnement.id || '-',
      abonnement.adherent_names?.join(', ') || '-',
      abonnement.cursus_nom?.join(', ') || 'Aucun cours',
      abonnement.date_debut && abonnement.date_fin
        ? `${new Date(abonnement.date_debut).toLocaleDateString('fr-FR')} - ${new Date(abonnement.date_fin).toLocaleDateString('fr-FR')}` // Fixed template literal syntax
        : '-',
      abonnement.pack?.nom || abonnement.packId || '-',
      abonnement.prix ? `${Number(abonnement.prix).toFixed(2)} TND` : '-', // Fixed template literal syntax
    ]];
    currentY = drawTable(doc, abonnementHeaders, abonnementRows, 40, currentY, [80, 110, 110, 120, 100, 80], 20);
    currentY += 20;
  }

  // Footer
  doc.font('Helvetica').fontSize(10).fillColor('#7F8C8D');
  doc.text('Merci de votre confiance !', 40, doc.page.height - 60, { align: 'center' });
  doc.text('Club Vamos Padel - Route de Teniour km 8, Sfax - Tél: +216 98 510 150 - Email: contact@vamospadel.com', 40, doc.page.height - 45, { align: 'center' });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', async () => {
      try {
        await fsPromises.access(filePath, fs.constants.R_OK);
        resolve(pdfFileName);
      } catch (err) {
        console.error(`PDF file not accessible after creation at ${filePath}:`, err); // Fixed template literal syntax
        reject(new Error(`PDF créé mais non accessible: ${err.message}`)); // Fixed template literal syntax
      }
    });
    stream.on('error', (err) => {
      console.error(`Error creating PDF at ${filePath}:`, err); // Fixed template literal syntax
      reject(new Error(`Erreur lors de la création du PDF: ${err.message}`)); // Fixed template literal syntax
    });
  });

  return pdfFileName;
};

export const createFacture = async (data) => {

  try {
    const {
      numero_facture = generateInvoiceNumber(),
      montant_ht,
      montant_tva,
      montant_total,
      taux_tva,
      date_creation,
      date_echeance,
      statut,
      mode_paiement,
      description,
      reservationIds = [],
      abonnementId,
      seanceId,
    } = data;

    if (!numero_facture || !montant_ht || !montant_tva || !montant_total || !taux_tva) {
      throw new Error("Les champs obligatoires (numero_facture, montant_ht, montant_tva, montant_total, taux_tva) sont requis");
    }
    if (typeof numero_facture !== 'string' || numero_facture.trim() === '') {
      throw new Error("Le numéro de facture doit être une chaîne non vide");
    }

    const [existing] = await pool.query(
      `SELECT id FROM factures WHERE numero_facture = ?`,
      [numero_facture]
    );
    if (existing.length > 0) {
      throw new Error("Le numéro de facture existe déjà");
    }

    const [result] = await pool.query(
      `INSERT INTO factures (
        numero_facture, montant_ht, montant_tva, montant_total,
        taux_tva, date_creation, date_echeance, statut, mode_paiement, description, chemin_pdf
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numero_facture,
        montant_ht,
        montant_tva,
        montant_total,
        taux_tva,
        date_creation || new Date(),
        date_echeance || null,
        statut || "en attente",
        mode_paiement || "non défini",
        description || null,
        ''
      ]
    );
    const factureId = result.insertId;

    let reservations = [];
    let abonnement = null;
    let seance = null;
    let adherent_nom = null;

    if (reservationIds.length > 0) {
      await pool.query(
        `UPDATE reservations SET factureId = ? WHERE id IN (?)`,
        [factureId, reservationIds]
      );
      try {
        const [reservationRows] = await pool.query(
          `SELECT r.id, r.date, r.start_time, r.end_time, r.status, r.factureId, r.adherentId, 
                  r.clientName, r.prix, r.emplacementId, r.montant_total, r.date_creation, 
                  r.date_echeance, r.facture_statut, e.nom AS emplacement_nom, 
                  CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
           FROM reservations r
           LEFT JOIN emplacements e ON r.emplacementId = e.id
           LEFT JOIN adherents a ON r.adherentId = a.id
           WHERE r.factureId = ?`,
          [factureId]
        );
        reservations = reservationRows;

        if (reservations.length > 0) {
          adherent_nom = reservations[0].adherent_nom || reservations[0].clientName || null;
        }
      } catch (err) {
        console.error('Error fetching reservations for PDF in createFacture:', err);
      }
    }

    if (abonnementId) {
      await pool.query(
        `UPDATE abonnements SET factureId = ? WHERE id = ?`,
        [factureId, abonnementId]
      );
      try {
        const [abonnementRows] = await pool.query(
          `SELECT ab.id, ab.packId, ab.prix, ab.nbseances, ab.date_debut, ab.date_fin, 
                  p.nom AS pack_nom, 
                  GROUP_CONCAT(CONCAT(a.prenom, ' ', a.nom)) AS adherent_nom, 
                  GROUP_CONCAT(c.nom) AS cursus_nom, 
                  GROUP_CONCAT(CONCAT(a.prenom, ' ', a.nom)) AS adherent_names
           FROM abonnements ab
           LEFT JOIN packs p ON ab.packId = p.id
           LEFT JOIN abonnement_adherent aa ON ab.id = aa.abonnementId
           LEFT JOIN adherents a ON aa.adherentId = a.id
           LEFT JOIN abonnements_cours ac ON ab.id = ac.abonnementId
           LEFT JOIN cours c ON ac.coursId = c.id
           WHERE ab.id = ?
           GROUP BY ab.id`,
          [abonnementId]
        );
        if (abonnementRows.length > 0) {
          abonnement = abonnementRows[0];
          abonnement.cursus_nom = abonnement.cursus_nom ? abonnement.cursus_nom.split(',') : [];
          abonnement.adherent_names = abonnement.adherent_names ? abonnement.adherent_names.split(',') : [];
          if (!adherent_nom) {
            adherent_nom = abonnement.adherent_nom ? abonnement.adherent_nom.split(', ')[0] : null;
          }
        }
      } catch (err) {
        console.error('Error fetching abonnement for PDF in createFacture:', err);
      }
    }

    if (seanceId) {
      await pool.query(
        `UPDATE seances SET factureId = ? WHERE id = ?`,
        [factureId, seanceId]
      );
      try {
        const [seanceRows] = await pool.query(
          `SELECT s.id, s.nom, s.dateSeance, s.heureDebut, s.heureFin, s.prix, s.statut,
                  c.nom AS cours_nom, co.nom AS coach_nom, e.nom AS emplacement_nom, 
                  CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
           FROM seances s
           LEFT JOIN cours c ON s.coursId = c.id
           LEFT JOIN coaches co ON s.coachId = co.id
           LEFT JOIN emplacements e ON s.emplacementId = e.id
           LEFT JOIN adherents a ON s.adherentId = a.id
           WHERE s.id = ?`,
          [seanceId]
        );
        if (seanceRows.length > 0) {
          seance = seanceRows[0];
          if (!adherent_nom) {
            adherent_nom = seance.adherent_nom;
          }
        }
      } catch (err) {
        console.error('Error fetching seance for PDF in createFacture:', err);
      }
    }

    const pdfFileName = await generatePDF(
      {
        ...data,
        id: factureId,
        adherent_nom,
        numero_facture,
        statut: statut || 'en attente',
        mode_paiement: mode_paiement || 'non défini',
      },
      reservations,
      abonnement,
      seance
    );

    await pool.query(
      `UPDATE factures SET chemin_pdf = ? WHERE id = ?`,
      [pdfFileName, factureId]
    );

    return {
      facture_id: factureId,
      numero_facture,
      montant_ht,
      montant_tva,
      montant_total,
      taux_tva,
      date_creation: date_creation || new Date(),
      date_echeance,
      statut: statut || "en attente",
      mode_paiement: mode_paiement || "non défini",
      description,
      chemin_pdf: pdfFileName,
    };
  } catch (err) {
    console.error("Error in createFacture:", err.message);
    throw err;
  }
};

export const getFactureById = async (id) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM factures WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      throw new Error("Facture introuvable");
    }
    const facture = rows[0];
    return {
      ...facture,
      montant_ht: Number(facture.montant_ht),
      montant_tva: Number(facture.montant_tva),
      montant_total: Number(facture.montant_total),
      taux_tva: Number(facture.taux_tva),
    };
  } catch (err) {
    console.error(`Error in getFactureById for id ${id}:`, err.message); // Fixed template literal syntax
    throw err;
  }
};

export const updateFactureStatus = async (id, statut) => {

  try {
    const validStatuses = ["payée", "impayée", "en attente"];
    if (!validStatuses.includes(statut)) {
      throw new Error("Statut invalide");
    }
    const [result] = await pool.query(
      `UPDATE factures SET statut = ? WHERE id = ?`,
      [statut, id]
    );
    if (result.affectedRows === 0) {
      throw new Error("Facture introuvable");
    }

    const [factureRows] = await pool.query(`SELECT * FROM factures WHERE id = ?`, [id]);
    if (factureRows.length === 0) {
      throw new Error("Facture introuvable après mise à jour");
    }
    const facture = factureRows[0];
    if (!facture.numero_facture || typeof facture.numero_facture !== 'string') {
      console.error('Invalid numero_facture in database for id:', id, facture.numero_facture);
      throw new Error("Numéro de facture invalide dans la base de données");
    }

    let reservations = [];
    let abonnement = null;
    let seance = null;
    let adherent_nom = null;

    try {
      const [reservationRows] = await pool.query(
        `SELECT r.id, r.date, r.start_time, r.end_time, r.status, r.factureId, r.adherentId, 
                r.clientName, r.prix, r.emplacementId, r.montant_total, r.date_creation, 
                r.date_echeance, r.facture_statut, e.nom AS emplacement_nom, 
                CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
         FROM reservations r
         LEFT JOIN emplacements e ON r.emplacementId = e.id
         LEFT JOIN adherents a ON r.adherentId = a.id
         WHERE r.factureId = ?`,
        [id]
      );
      reservations = reservationRows;
      if (reservations.length > 0) {
        adherent_nom = reservations[0].adherent_nom || reservations[0].clientName || null;
      }
    } catch (err) {
      console.error('Error fetching reservations for PDF in updateFactureStatus:', err);
    }

    try {
      const [abonnementRows] = await pool.query(
        `SELECT ab.id, ab.packId, ab.prix, ab.nbseances, ab.date_debut, ab.date_fin, 
                p.nom AS pack_nom, 
                GROUP_CONCAT(CONCAT(a.prenom, ' ', a.nom)) AS adherent_nom, 
                GROUP_CONCAT(c.nom) AS cursus_nom, 
                GROUP_CONCAT(CONCAT(a.prenom, ' ', a.nom)) AS adherent_names
         FROM abonnements ab
         LEFT JOIN packs p ON ab.packId = p.id
         LEFT JOIN abonnement_adherent aa ON ab.id = aa.abonnementId
         LEFT JOIN adherents a ON aa.adherentId = a.id
         LEFT JOIN abonnements_cours ac ON ab.id = ac.abonnementId
         LEFT JOIN cours c ON ac.coursId = c.id
         WHERE ab.factureId = ?
         GROUP BY ab.id`,
        [id]
      );
      if (abonnementRows.length > 0) {
        abonnement = abonnementRows[0];
        abonnement.cursus_nom = abonnement.cursus_nom ? abonnement.cursus_nom.split(',') : [];
        abonnement.adherent_names = abonnement.adherent_names ? abonnement.adherent_names.split(',') : [];
        if (!adherent_nom) {
          adherent_nom = abonnement.adherent_nom ? abonnement.adherent_nom.split(', ')[0] : null;
        }
      }
    } catch (err) {
      console.error('Error fetching abonnement for PDF in updateFactureStatus:', err);
    }

    try {
      const [seanceRows] = await pool.query(
        `SELECT s.nom, s.dateSeance, s.heureDebut, s.heureFin, s.prix, s.statut,
                c.nom AS cours_nom, co.nom AS coach_nom, e.nom AS emplacement_nom, 
                CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
         FROM seances s
         LEFT JOIN cours c ON s.coursId = c.id
         LEFT JOIN coaches co ON s.coachId = co.id
         LEFT JOIN emplacements e ON s.emplacementId = e.id
         LEFT JOIN adherents a ON s.adherentId = a.id
         WHERE s.factureId = ?`,
        [id]
      );
      if (seanceRows.length > 0) {
        seance = seanceRows[0];
        if (!adherent_nom) {
          adherent_nom = seance.adherent_nom;
        }
      }
    } catch (err) {
      console.error('Error fetching seance for PDF in updateFactureStatus:', err);
    }
    await generatePDF({ ...facture, adherent_nom }, reservations, abonnement, seance);

  } catch (err) {
    console.error(`Error in updateFactureStatus for id ${id}:`, err.message); // Fixed template literal syntax
    throw err;
  }
};

export const checkNumeroFacture = async (numero_facture) => {
  try {
    if (!numero_facture || typeof numero_facture !== 'string') {
      throw new Error("Numéro de facture invalide");
    }
    const [rows] = await pool.query(
      `SELECT id FROM factures WHERE numero_facture = ?`,
      [numero_facture]
    );
    return { exists: rows.length > 0 };
  } catch (err) {
    console.error(`Error in checkNumeroFacture for numero_facture ${numero_facture}:`, err.message); // Fixed template literal syntax
    throw err;
  }
};

export const updateFacturePaymentMethod = async (id, mode_paiement) => {
  try {
    const validMethods = ["Chèque", "Espèces"];
    if (!validMethods.includes(mode_paiement)) {
      throw new Error("Mode de paiement invalide");
    }
    const [result] = await pool.query(
      `UPDATE factures SET mode_paiement = ? WHERE id = ?`,
      [mode_paiement, id]
    );
    if (result.affectedRows === 0) {
      throw new Error("Facture introuvable");
    }

    const [factureRows] = await pool.query(`SELECT * FROM factures WHERE id = ?`, [id]);
    if (factureRows.length === 0) {
      throw new Error("Facture introuvable après mise à jour");
    }
    const facture = factureRows[0];
    if (!facture.numero_facture || typeof facture.numero_facture !== 'string') {
      console.error('Invalid numero_facture in database for id:', id, facture.numero_facture);
      throw new Error("Numéro de facture invalide dans la base de données");
    }

    let reservations = [];
    let abonnement = null;
    let seance = null;
    let adherent_nom = null;

    try {
      const [reservationRows] = await pool.query(
        `SELECT r.id, r.date, r.start_time, r.end_time, r.status, r.factureId, r.adherentId, 
                r.clientName, r.prix, r.emplacementId, r.montant_total, r.date_creation, 
                r.date_echeance, r.facture_statut, e.nom AS emplacement_nom, 
                CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
         FROM reservations r
         LEFT JOIN emplacements e ON r.emplacementId = e.id
         LEFT JOIN adherents a ON r.adherentId = a.id
         WHERE r.factureId = ?`,
        [id]
      );
      reservations = reservationRows;
      if (reservations.length > 0) {
        adherent_nom = reservations[0].adherent_nom || reservations[0].clientName || null;
      } 
    } catch (err) {
      console.error('Error fetching reservations for PDF in updateFacturePaymentMethod:', err);
    }

    try {
      const [abonnementRows] = await pool.query(
        `SELECT ab.id, ab.packId, ab.prix, ab.nbseances, ab.date_debut, ab.date_fin, 
                p.nom AS pack_nom, 
                GROUP_CONCAT(CONCAT(a.prenom, ' ', a.nom)) AS adherent_nom, 
                GROUP_CONCAT(c.nom) AS cursus_nom, 
                GROUP_CONCAT(CONCAT(a.prenom, ' ', a.nom)) AS adherent_names
         FROM abonnements ab
         LEFT JOIN packs p ON ab.packId = p.id
         LEFT JOIN abonnement_adherent aa ON ab.id = aa.abonnementId
         LEFT JOIN adherents a ON aa.adherentId = a.id
         LEFT JOIN abonnements_cours ac ON ab.id = ac.abonnementId
         LEFT JOIN cours c ON ac.coursId = c.id
         WHERE ab.factureId = ?
         GROUP BY ab.id`,
        [id]
      );
      if (abonnementRows.length > 0) {
        abonnement = abonnementRows[0];
        abonnement.cursus_nom = abonnement.cursus_nom ? abonnement.cursus_nom.split(',') : [];
        abonnement.adherent_names = abonnement.adherent_names ? abonnement.adherent_names.split(',') : [];
        if (!adherent_nom) {
          adherent_nom = abonnement.adherent_nom ? abonnement.adherent_nom.split(', ')[0] : null;
        }
      } 
    } catch (err) {
      console.error('Error fetching abonnement for PDF in updateFacturePaymentMethod:', err);
    }

    try {
      const [seanceRows] = await pool.query(
        `SELECT s.nom, s.dateSeance, s.heureDebut, s.heureFin, s.prix, s.statut,
                c.nom AS cours_nom, co.nom AS coach_nom, e.nom AS emplacement_nom, 
                CONCAT(a.prenom, ' ', a.nom) AS adherent_nom
         FROM seances s
         LEFT JOIN cours c ON s.coursId = c.id
         LEFT JOIN coaches co ON s.coachId = co.id
         LEFT JOIN emplacements e ON s.emplacementId = e.id
         LEFT JOIN adherents a ON s.adherentId = a.id
         WHERE s.factureId = ?`,
        [id]
      );
      if (seanceRows.length > 0) {
        seance = seanceRows[0];
        if (!adherent_nom) {
          adherent_nom = seance.adherent_nom;
        }
      }
    } catch (err) {
      console.error('Error fetching seance for PDF in updateFacturePaymentMethod:', err);
    }

    await generatePDF({ ...facture, adherent_nom }, reservations, abonnement, seance);

  } catch (err) {
    console.error(`Error in updateFacturePaymentMethod for id ${id}:`, err.message); // Fixed template literal syntax
    throw err;
  }
};