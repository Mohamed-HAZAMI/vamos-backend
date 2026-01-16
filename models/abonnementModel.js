import pool from "../config/db.js";
import { createFacture } from "./factureModel.js";


export const createAbonnement = async (data) => {
  try {
    const {
      adherent_ids,
      adherent_id,
      cours_ids,
      date_debut,
      date_fin,
      emplacement_ids,
      packId,
      nbseances,
      prix,
    } = data;

    // Validate adherents
    let adherentsToInsert = [];
    if (adherent_ids && Array.isArray(adherent_ids) && adherent_ids.length > 0) {
      adherentsToInsert = adherent_ids.filter((id) => Number.isInteger(Number(id)) && Number(id) > 0);
    } else if (adherent_id && Number.isInteger(Number(adherent_id)) && Number(adherent_id) > 0) {
      adherentsToInsert = [Number(adherent_id)];
    }

    if (adherentsToInsert.length === 0) {
      throw new Error("Au moins un adhérent est requis");
    }

    // Validate prix
    const prixNum = prix ? Number(prix) : null;
    if (prixNum !== null && (isNaN(prixNum) || prixNum < 0)) {
      throw new Error("Prix invalide");
    }

    const emplacementIds = Array.isArray(emplacement_ids)
      ? emplacement_ids.filter((id) => Number.isInteger(Number(id)) && Number(id) > 0)
      : [];
    const coursIds = Array.isArray(cours_ids)
      ? cours_ids.filter((id) => Number.isInteger(Number(id)) && Number(id) > 0)
      : [];

    // Start a transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert into abonnements table
      const [result] = await connection.query(
        `INSERT INTO abonnements (
          date_debut, date_fin, created_at,
          packId, nbseances, prix, facture_id
        ) VALUES (?, ?, NOW(), ?, ?, ?, NULL)`,
        [date_debut, date_fin, packId, nbseances, prixNum]
      );

      const abonnementId = result.insertId;

      // Insert adherent associations into abonnement_adherent
      if (adherentsToInsert.length > 0) {
        const adherentValues = adherentsToInsert.map((adherentId) => [abonnementId, Number(adherentId)]);
        await connection.query(
          `INSERT INTO abonnement_adherent (abonnement_id, adherent_id) VALUES ?`,
          [adherentValues]
        );
      }

      // Insert emplacement associations
      if (emplacementIds.length > 0) {
        const values = emplacementIds.map((emplacementId) => [abonnementId, Number(emplacementId)]);
        await connection.query(
          `INSERT INTO abonnement_emplacement (abonnement_id, emplacement_id) VALUES ?`,
          [values]
        );
      }

      // Insert course associations
      if (coursIds.length > 0) {
        const values = coursIds.map((coursId) => [abonnementId, Number(coursId)]);
        await connection.query(
          `INSERT INTO abonnement_cours (abonnement_id, cours_id) VALUES ?`,
          [values]
        );
      }

      // Generate invoice details
      const VAT_RATE = 20.0; // 20% TVA
      const montant_ht = prixNum || (packId ? await getPackPrice(packId, connection) : 100);
      const montant_tva = (montant_ht * VAT_RATE) / 100;
      const montant_total = montant_ht + montant_tva;

      const description = packId
        ? `Abonnement Pack: ${await getPackName(packId, connection)}`
        : nbseances
        ? `Abonnement Séances: ${nbseances} séances`
        :` Abonnement Emplacements`;

      const dateEmission = new Date().toISOString().split("T")[0];
      const dateEcheance = new Date(new Date().setDate(new Date().getDate() + 30))
        .toISOString()
        .split("T")[0];

      const invoiceData = {
        montant_ht: montant_ht.toFixed(2),
        taux_tva: VAT_RATE,
        montant_tva: montant_tva.toFixed(2),
        montant_total: montant_total.toFixed(2),
        date_creation: dateEmission,
        date_echeance: dateEcheance,
        description,
        statut: "en attente",
        mode_paiement: "non défini",
      };

      // Generate invoice and get facture_id
      const { facture_id, numero_facture } = await createFacture(invoiceData);

      // Update abonnement with facture_id
      await connection.query(
        `UPDATE abonnements SET facture_id = ? WHERE id = ?`,
        [facture_id, abonnementId]
      );

      // Fetch adherent information
      const [adherentRows] = await connection.query(
        `SELECT id, nom, prenom, CONCAT(nom, ' ', prenom) AS full_name 
         FROM adherents 
         WHERE id IN (?)`,
        [adherentsToInsert]
      );

      const adherents = adherentRows.map(row => ({
        id: row.id,
        nom: row.nom,
        prenom: row.prenom,
        full_name: row.full_name
      }));

      await connection.commit();
      return {
        abonnementId,
        facture_id,
        numero_facture,
        montant_ht: invoiceData.montant_ht,
        montant_tva: invoiceData.montant_tva,
        montant_total: invoiceData.montant_total,
        taux_tva: invoiceData.taux_tva,
        adherents // Return adherent details
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Error in createAbonnement:", err.message);
    throw err;
  }
};

// Helper function to get pack price
async function getPackPrice(packId, connection) {
  if (!packId) return 100; // Fallback price
  const [rows] = await connection.query(`SELECT prix FROM packs WHERE id = ?`, [packId]);
  return rows[0]?.prix || 100;
}

// Helper function to get pack name
async function getPackName(packId, connection) {
  if (!packId) return "Pack inconnu";
  const [rows] = await connection.query(`SELECT nom FROM packs WHERE id = ?`, [packId]);
  return rows[0]?.nom || "Pack inconnu";
}

// Function to generate invoice details for testing
export const generateInvoiceDetails = async (prix, packId, nbseances, emplacement_ids) => {
  try {
    const connection = await pool.getConnection();
    try {
      const VAT_RATE = 20.0;
      const montant_ht = prix ? Number(prix) : (packId ? await getPackPrice(packId, connection) : 100);
      if (isNaN(montant_ht) || montant_ht < 0) {
        throw new Error("Prix invalide");
      }
      const montant_tva = (montant_ht * VAT_RATE) / 100;
      const montant_total = montant_ht + montant_tva;

      const description = packId
        ? `Abonnement Pack: ${await getPackName(packId, connection)}`
        : nbseances
        ? `Abonnement Séances: ${nbseances} séances`
        : emplacement_ids?.length > 0
        ? `Abonnement Emplacements`
        : `Abonnement Standard`;

      const dateEmission = new Date().toISOString().split("T")[0];
      const dateEcheance = new Date(new Date().setDate(new Date().getDate() + 30))
        .toISOString()
        .split("T")[0];

      const invoiceData = {
        montant_ht: montant_ht.toFixed(2),
        taux_tva: VAT_RATE,
        montant_tva: montant_tva.toFixed(2),
        montant_total: montant_total.toFixed(2),
        date_creation: dateEmission,
        date_echeance: dateEcheance,
        description,
        statut: "en attente",
        mode_paiement: "non défini",
      };

      const { facture_id, numero_facture } = await createFacture(invoiceData);
      return { facture_id, numero_facture, ...invoiceData };
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Error in generateInvoiceDetails:", err.message);
    throw err;
  }
};

export const addCourseToAbonnement = async (abonnementId, coursId) => {
  try {
    const coursIdNum = Number(coursId);
    if (!Number.isInteger(coursIdNum) || coursIdNum <= 0) {
      throw new Error("cours_id invalide");
    }

    const [abonnementCheck] = await pool.query(`SELECT id FROM abonnements WHERE id = ?`, [abonnementId]);
    if (abonnementCheck.length === 0) {
      throw new Error("Abonnement introuvable");
    }

    const [coursCheck] = await pool.query(
      `SELECT id FROM cours WHERE id = ? AND status = 'active'`,
      [coursIdNum]
    );
    if (coursCheck.length === 0) {
      throw new Error("Cours introuvable ou inactif");
    }

    const [existing] = await pool.query(
      `SELECT abonnement_id, cours_id FROM abonnement_cours WHERE abonnement_id = ? AND cours_id = ?`,
      [abonnementId, coursIdNum]
    );
    if (existing.length > 0) {
      throw new Error("Ce cours est déjà associé à cet abonnement");
    }

    await pool.query(
      `INSERT INTO abonnement_cours (abonnement_id, cours_id) VALUES (?, ?)`,
      [abonnementId, coursIdNum]
    );

  } catch (err) {
    console.error(`Error in addCourseToAbonnement for abonnementId ${abonnementId}, coursId ${coursId}:`, err.message);
    throw err;
  }
};

export const getAllAbonnements = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.id,
        a.date_debut,
        a.date_fin,
        a.created_at,
        a.nbseances,
        a.prix,
        a.packId,
        a.facture_id,
        p.nom AS pack_nom,
        p.prix AS pack_prix,
        f.id AS facture_id,
        f.numero_facture,
        f.montant_total,
        f.montant_ht,
        f.montant_tva,
        f.taux_tva,
        f.date_creation AS facture_date_creation,
        f.date_echeance,
        f.statut AS statut_facture,
        GROUP_CONCAT(DISTINCT aa.adherent_id) AS adherent_ids,
        GROUP_CONCAT(DISTINCT CONCAT(ad.nom, ' ', ad.prenom)) AS adherent_names,
        GROUP_CONCAT(DISTINCT ac.cours_id) AS cours_ids,
        GROUP_CONCAT(DISTINCT c.nom) AS cours_names,
        GROUP_CONCAT(DISTINCT ae.emplacement_id) AS emplacement_ids,
        GROUP_CONCAT(DISTINCT e.nom) AS emplacement_names
      FROM abonnements a
      LEFT JOIN packs p ON a.packId = p.id
      LEFT JOIN factures f ON a.facture_id = f.id
      LEFT JOIN abonnement_adherent aa ON a.id = aa.abonnement_id
      LEFT JOIN adherents ad ON aa.adherent_id = ad.id
      LEFT JOIN abonnement_cours ac ON a.id = ac.abonnement_id
      LEFT JOIN cours c ON ac.cours_id = c.id
      LEFT JOIN abonnement_emplacement ae ON a.id = ae.abonnement_id
      LEFT JOIN emplacements e ON ae.emplacement_id = e.id
      GROUP BY a.id
    `);
    return rows.map((row) => ({
      id: row.id,
      adherent_ids: row.adherent_ids ? row.adherent_ids.split(",").map(Number) : [],
      adherent_names: row.adherent_names ? row.adherent_names.split(",") : [],
      cours_ids: row.cours_ids ? row.cours_ids.split(",").map(Number) : [],
      cursus_nom: row.cours_names ? row.cours_names.split(",") : [],
      emplacement_ids: row.emplacement_ids ? row.emplacement_ids.split(",").map(Number) : [],
      emplacement_nom: row.emplacement_names ? row.emplacement_names.split(",") : [],
      date_debut: row.date_debut,
      date_fin: row.date_fin,
      created_at: row.created_at,
      nbseances: row.nbseances,
      prix: row.prix != null ? Number(row.prix) : null,
      pack: row.packId
        ? {
            id: row.packId,
            nom: row.pack_nom,
            prix: Number(row.pack_prix),
          }
        : null,
      facture: row.facture_id
        ? {
            id: row.facture_id,
            numero_facture: row.numero_facture,
            montant_total: Number(row.montant_total),
            montant_ht: Number(row.montant_ht),
            montant_tva: Number(row.montant_tva),
            taux_tva: Number(row.taux_tva),
            date_creation: row.facture_date_creation,
            date_echeance: row.date_echeance,
            statut: row.statut_facture,
          }
        : null,
    }));
  } catch (err) {
    console.error("Error in getAllAbonnements:", err.message);
    throw err;
  }
};

export const getAbonnementById = async (id) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.id,
        a.date_debut,
        a.date_fin,
        a.created_at,
        a.nbseances,
        a.prix,
        a.packId,
        a.facture_id,
        p.nom AS pack_nom,
        p.prix AS pack_prix,
        f.id AS facture_id,
        f.numero_facture,
        f.montant_total,
        f.montant_ht,
        f.montant_tva,
        f.taux_tva,
        f.date_creation AS facture_date_creation,
        f.date_echeance,
        f.statut AS statut_facture,
        GROUP_CONCAT(DISTINCT aa.adherent_id) AS adherent_ids,
        GROUP_CONCAT(DISTINCT CONCAT(ad.nom, ' ', ad.prenom)) AS adherent_names,
        GROUP_CONCAT(DISTINCT ac.cours_id) AS cours_ids,
        GROUP_CONCAT(DISTINCT c.nom) AS cours_names,
        GROUP_CONCAT(DISTINCT ae.emplacement_id) AS emplacement_ids,
        GROUP_CONCAT(DISTINCT e.nom) AS emplacement_names
      FROM abonnements a
      LEFT JOIN packs p ON a.packId = p.id
      LEFT JOIN factures f ON a.facture_id = f.id
      LEFT JOIN abonnement_adherent aa ON a.id = aa.abonnement_id
      LEFT JOIN adherents ad ON aa.adherent_id = ad.id
      LEFT JOIN abonnement_cours ac ON a.id = ac.abonnement_id
      LEFT JOIN cours c ON ac.cours_id = c.id
      LEFT JOIN abonnement_emplacement ae ON a.id = ae.abonnement_id
      LEFT JOIN emplacements e ON ae.emplacement_id = e.id
      WHERE a.id = ?
      GROUP BY a.id
    `, [id]);
   
    const abonnement = rows[0];
    if (abonnement) {
      return {
        id: abonnement.id,
        adherent_ids: abonnement.adherent_ids ? abonnement.adherent_ids.split(",").map(Number) : [],
        adherent_names: abonnement.adherent_names ? abonnement.adherent_names.split(",") : [],
        cours_ids: abonnement.cours_ids ? abonnement.cours_ids.split(",").map(Number) : [],
        cursus_nom: abonnement.cours_names ? abonnement.cours_names.split(",") : [],
        emplacement_ids: abonnement.emplacement_ids ? abonnement.emplacement_ids.split(",").map(Number) : [],
        emplacement_nom: abonnement.emplacement_names ? abonnement.emplacement_names.split(",") : [],
        date_debut: abonnement.date_debut,
        date_fin: abonnement.date_fin,
        created_at: abonnement.created_at,
        nbseances: abonnement.nbseances,
        prix: abonnement.prix != null ? Number(abonnement.prix) : null,
        pack: abonnement.packId
          ? {
              id: abonnement.packId,
              nom: abonnement.pack_nom,
              prix: Number(abonnement.pack_prix),
            }
          : null,
        facture: abonnement.facture_id
          ? {
              id: abonnement.facture_id,
              numero_facture: abonnement.numero_facture,
              montant_total: Number(abonnement.montant_total),
              montant_ht: Number(abonnement.montant_ht),
              montant_tva: Number(abonnement.montant_tva),
              taux_tva: Number(abonnement.taux_tva),
              date_creation: abonnement.facture_date_creation,
              date_echeance: abonnement.date_echeance,
              statut: abonnement.statut_facture,
            }
          : null,
      };
    }
    return null;
  } catch (err) {
    console.error(`Error in getAbonnementById for id ${id}:`, err.message);
    throw err;
  }
};

export const updateAbonnement = async (id, data) => {

  try {
    const {
      adherent_ids,
      adherent_id,
      cours_ids,
      date_debut,
      date_fin,
      emplacement_ids,
      packId,
      nbseances,
      prix,
    } = data;

    // Validate adherents
    let adherentsToInsert = [];
    if (adherent_ids && Array.isArray(adherent_ids) && adherent_ids.length > 0) {
      adherentsToInsert = adherent_ids.filter((id) => Number.isInteger(Number(id)) && Number(id) > 0);
    } else if (adherent_id && Number.isInteger(Number(adherent_id)) && Number(adherent_id) > 0) {
      adherentsToInsert = [Number(adherent_id)];
    }

    if (adherentsToInsert.length === 0) {
      throw new Error("Au moins un adhérent est requis");
    }

    // Validate prix
    const prixNum = prix ? Number(prix) : null;
    if (prixNum !== null && (isNaN(prixNum) || prixNum < 0)) {
      throw new Error("Prix invalide");
    }

    const emplacementIds = Array.isArray(emplacement_ids)
      ? emplacement_ids.filter((id) => Number.isInteger(Number(id)) && Number(id) > 0)
      : [];
    const coursIds = Array.isArray(cours_ids)
      ? cours_ids.filter((id) => Number.isInteger(Number(id)) && Number(id) > 0)
      : [];

    // Start a transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update abonnements table
      await connection.query(
        `UPDATE abonnements SET 
          date_debut = ?, date_fin = ?, 
          packId = ?, nbseances = ?, prix = ?
         WHERE id = ?`,
        [date_debut, date_fin, packId, nbseances, prixNum, id]
      );

      // Update adherent associations
      await connection.query(`DELETE FROM abonnement_adherent WHERE abonnement_id = ?`, [id]);
      if (adherentsToInsert.length > 0) {
        const adherentValues = adherentsToInsert.map((adherentId) => [id, Number(adherentId)]);
        await connection.query(
          `INSERT INTO abonnement_adherent (abonnement_id, adherent_id) VALUES ?`,
          [adherentValues]
        );
      }

      // Delete existing course associations
      await connection.query(`DELETE FROM abonnement_cours WHERE abonnement_id = ?`, [id]);

      // Delete existing emplacement associations
      await connection.query(`DELETE FROM abonnement_emplacement WHERE abonnement_id = ?`, [id]);

      // Insert new course associations
      if (coursIds.length > 0) {
        const values = coursIds.map((coursId) => [id, Number(coursId)]);
        await connection.query(
          `INSERT INTO abonnement_cours (abonnement_id, cours_id) VALUES ?`,
          [values]
        );
      }

      // Insert new emplacement associations
      if (emplacementIds.length > 0) {
        const values = emplacementIds.map((emplacementId) => [id, Number(emplacementId)]);
        await connection.query(
          `INSERT INTO abonnement_emplacement (abonnement_id, emplacement_id) VALUES ?`,
          [values]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(`Error in updateAbonnement for id ${id}:`, err.message);
    throw err;
  }
};

export const deleteAbonnement = async (id) => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if subscription exists and get associated invoice
      const [rows] = await connection.query(
        `SELECT id, facture_id FROM abonnements WHERE id = ?`,
        [id]
      );
      if (rows.length === 0) {
        throw new Error("Abonnement introuvable");
      }
      const factureId = rows[0].facture_id;

      // Delete associated invoice if it exists
      if (factureId) {
        const [factureCheck] = await connection.query(
          `SELECT id FROM factures WHERE id = ?`,
          [factureId]
        );
        if (factureCheck.length > 0) {
          // CORRECTED LINE - moved parameter array outside the template literal
          await connection.query(`DELETE FROM factures WHERE id = ?`, [factureId]);
        } else {
          console.warn(`No facture found with id: ${factureId} for abonnement id: ${id}`);
        }
      }

      // Delete related associations
      await connection.query(
        `DELETE FROM abonnement_adherent WHERE abonnement_id = ?`,
        [id]
      );
      await connection.query(
        `DELETE FROM abonnement_cours WHERE abonnement_id = ?`,
        [id]
      );
      await connection.query(
        `DELETE FROM abonnement_emplacement WHERE abonnement_id = ?`,
        [id]
      );

      // Delete the abonnement
      const [deleteResult] = await connection.query(
        `DELETE FROM abonnements WHERE id = ?`,
        [id]
      );
      if (deleteResult.affectedRows === 0) {
        throw new Error("Aucun abonnement supprimé");
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(`Error in deleteAbonnement for id ${id}:`, err.message);
    throw err;
  }
};

export const getAbonnementByAdherentId = async (adherentId) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.id,
        a.date_debut,
        a.date_fin,
        a.created_at,
        a.nbseances,
        a.prix,
        a.packId,
        a.facture_id,
        p.nom AS pack_nom,
        p.prix AS pack_prix,
        f.id AS facture_id,
        f.numero_facture,
        f.montant_total,
        f.montant_ht,
        f.montant_tva,
        f.taux_tva,
        f.date_creation AS facture_date_creation,
        f.date_echeance,
        f.statut AS statut_facture,
        GROUP_CONCAT(DISTINCT aa.adherent_id) AS adherent_ids,
        GROUP_CONCAT(DISTINCT CONCAT(ad.nom, ' ', ad.prenom)) AS adherent_names,
        GROUP_CONCAT(DISTINCT ac.cours_id) AS cours_ids,
        GROUP_CONCAT(DISTINCT c.nom) AS cours_names,
        GROUP_CONCAT(DISTINCT ae.emplacement_id) AS emplacement_ids,
        GROUP_CONCAT(DISTINCT e.nom) AS emplacement_names
      FROM abonnements a
      LEFT JOIN packs p ON a.packId = p.id
      LEFT JOIN factures f ON a.facture_id = f.id
      LEFT JOIN abonnement_adherent aa ON a.id = aa.abonnement_id
      LEFT JOIN adherents ad ON aa.adherent_id = ad.id
      LEFT JOIN abonnement_cours ac ON a.id = ac.abonnement_id
      LEFT JOIN cours c ON ac.cours_id = c.id
      LEFT JOIN abonnement_emplacement ae ON a.id = ae.abonnement_id
      LEFT JOIN emplacements e ON ae.emplacement_id = e.id
      WHERE aa.adherent_id = ?
      GROUP BY a.id
    `, [adherentId]);
    return rows.map((row) => ({
      id: row.id,
      adherent_ids: row.adherent_ids ? row.adherent_ids.split(",").map(Number) : [],
      adherent_names: row.adherent_names ? row.adherent_names.split(",") : [],
      cours_ids: row.cours_ids ? row.cours_ids.split(",").map(Number) : [],
      cursus_nom: row.cours_names ? row.cours_names.split(",") : [],
      emplacement_ids: row.emplacement_ids ? row.emplacement_ids.split(",").map(Number) : [],
      emplacement_nom: row.emplacement_names ? row.emplacement_names.split(",") : [],
      date_debut: row.date_debut,
      date_fin: row.date_fin,
      created_at: row.created_at,
      nbseances: row.nbseances,
      prix: row.prix != null ? Number(row.prix) : null,
      pack: row.packId
        ? {
            id: row.packId,
            nom: row.pack_nom,
            prix: Number(row.pack_prix),
          }
        : null,
      facture: row.facture_id
        ? {
            id: row.facture_id,
            numero_facture: row.numero_facture,
            montant_total: Number(row.montant_total),
            montant_ht: Number(row.montant_ht),
            montant_tva: Number(row.montant_tva),
            taux_tva: Number(row.taux_tva),
            date_creation: row.facture_date_creation,
            date_echeance: row.date_echeance,
            statut: row.statut_facture,
          }
        : null,
    }));
  } catch (err) {
    console.error(`Error in getAbonnementByAdherentId for adherentId ${adherentId}:`, err.message);
    throw err;
  }
};

export const getMonthlySubscriptionTotal = async (year, month) => {
  try {
    const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // Last day of the month

    const [rows] = await pool.query(
      `
      SELECT 
        SUM(COALESCE(a.prix, p.prix, 0)) AS total_price
      FROM abonnements a
      LEFT JOIN packs p ON a.packId = p.id
      WHERE a.date_debut <= ? AND a.date_fin >= ?
    `,
      [endDate, startDate]
    );

    const total = rows[0].total_price || 0;
    return { year, month, total_price: Number(total) };
  } catch (err) {
    console.error(`Error in getMonthlySubscriptionTotal for year ${year}, month ${month}:`, err.message);
    throw err;
  }
};

export const associateInvoiceToAbonnement = async (abonnementId, factureId) => {
  try {
    const [abonnementCheck] = await pool.query(`SELECT id FROM abonnements WHERE id = ?`, [abonnementId]);
    if (abonnementCheck.length === 0) {
      throw new Error("Abonnement introuvable");
    }

    const [factureCheck] = await pool.query(`SELECT id FROM factures WHERE id = ?`, [factureId]);
    if (factureCheck.length === 0) {
      throw new Error("Facture introuvable");
    }

    await pool.query(
     ` UPDATE abonnements SET facture_id = ? WHERE id = ?`,
      [factureId, abonnementId]
    );

  } catch (err) {
    console.error(`Error in associateInvoiceToAbonnement for abonnementId ${abonnementId}:`, err.message);
    throw err;
  }
};