import pool from "../config/db.js";

class Paiement {

  static async getAllPaiementByAdherentId(idAdherent) {
    const [rows] = await pool.query(`
      SELECT 
        a.id,
        a.date_debut,
        a.date_fin,
        a.durer_mois,
        a.nombre_activiter,
        a.nombre_de_personne,
        a.prix_ttc,
        a.remise,
        a.type_paiement,
        a.avance_paiement,
        a.banque,
        a.numero_compte,
        a.details_paiement,
        a.created_at as date_paiement,
        c.nom as cours_nom,
        g.nom as groupe_nom,
        -- Calcul du reste à payer
        (a.prix_ttc - COALESCE(a.avance_paiement, 0)) as reste_a_payer,
        -- Statut du paiement
        CASE 
          WHEN a.avance_paiement >= a.prix_ttc THEN 'Payé'
          WHEN a.avance_paiement > 0 THEN 'Acompte'
          ELSE 'Impayé'
        END as statut_paiement
      FROM abnmts a
      LEFT JOIN ecoles c ON a.cours_id = c.id
      LEFT JOIN \`groups\` g ON a.groupe_id = g.id
      WHERE a.adherent_id = ?
      ORDER BY a.created_at DESC
    `, [idAdherent]);
    return rows;
  }

  static async addPaiement({ abonnementId, montant, typePaiement, banque, numeroCompte, details }) {
    // Démarrer une transaction
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Récupérer l'abonnement actuel
      const [abonnements] = await connection.query(
        'SELECT prix_ttc, avance_paiement FROM abnmts WHERE id = ?',
        [abonnementId]
      );

      if (abonnements.length === 0) {
        throw new Error('Abonnement non trouvé');
      }

      const abonnement = abonnements[0];
      const prixTotal = parseFloat(abonnement.prix_ttc);
      const avanceActuelle = parseFloat(abonnement.avance_paiement || 0);
      const montantPaiement = parseFloat(montant);

      // 2. Calculer le nouveau total payé et le reste
      const nouveauTotalPaye = avanceActuelle + montantPaiement;
      const resteAPayer = prixTotal - nouveauTotalPaye;

      // 3. Vérifier si le montant dépasse le reste à payer
      if (montantPaiement > (prixTotal - avanceActuelle)) {
        throw new Error(`Le montant (${montantPaiement}€) est supérieur au reste à payer (${(prixTotal - avanceActuelle).toFixed(2)}€)`);
      }

      // 4. Mettre à jour l'abonnement avec le nouveau paiement
      const [result] = await connection.query(
        `UPDATE abnmts 
         SET avance_paiement = ?, 
             type_paiement = ?,
             banque = ?,
             numero_compte = ?,
             details_paiement = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [nouveauTotalPaye, typePaiement, banque, numeroCompte, details, abonnementId]
      );

      // 5. Récupérer l'abonnement mis à jour
      const [updatedAbonnement] = await connection.query(
        `SELECT *, (prix_ttc - avance_paiement) as reste_a_payer FROM abnmts WHERE id = ?`,
        [abonnementId]
      );

      await connection.commit();

      return {
        id: abonnementId,
        montantAjoute: montantPaiement,
        nouveauTotalPaye: nouveauTotalPaye,
        resteAPayer: updatedAbonnement[0].reste_a_payer,
        statut: nouveauTotalPaye >= prixTotal ? 'Payé' : 'Acompte'
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

}

export default Paiement;