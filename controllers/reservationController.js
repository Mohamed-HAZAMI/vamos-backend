import { config } from "dotenv";
import pool from "../config/db.js";



// Créer une nouvelle réservation (modifié avec banque)
import axios from 'axios';


// Configuration VAMOS
const VAMOS_CONFIG = {
  baseUrl: 'https://vamos-staging-webapi-bqbqahgpdqd9gwec.italynorth-01.azurewebsites.net/api/v1',
  clientId: '099F89B0-1148-40F8-B4A4-81E0D6B73141',
  facilityId: '10163',
  terrainCharAt: 1,
  credentials: {
    email: "ahmedmahjoub120321+admin-vs@gmail.com",
    password: "@VsStaging1!**",
    platform: 1
  }
};

// const VAMOS_CONFIG = {
//   baseUrl: 'https://vamos-webapi-chc2ejhfh4dndsdb.italynorth-01.azurewebsites.net/api/v2',
//   clientId: '5DB37AC2-FAB0-4588-A7AB-13CAAD8C69F9',
//   facilityId: '344',
//   terrainCharAt: 2,
//   credentials: {
//     email: "contact@vamossport.net",
//     password: "@Vamos510",
//     platform: 1
//   }
// };



// Fonction pour authentifier auprès de VAMOS
const authenticateVamos = async () => {
  try {
    const response = await axios.post(
      `${VAMOS_CONFIG.baseUrl}/authentication/login`,
      VAMOS_CONFIG.credentials,
      {
        headers: {
          'X-Client-Id': VAMOS_CONFIG.clientId,
          'Content-Type': 'application/json'
        }
      }
    );
    // console.log("response.data.accessToken" , response.data.accessToken)
    return response.data.accessToken;
  } catch (error) {
    console.error('Erreur authentification VAMOS:', error.response?.data || error.message);
    throw new Error(`Échec d'authentification VAMOS: ${error.message}`);
  }
};

// Fonction pour trouver et réserver un slot VAMOS
const reserveVamosSlot = async (dateDeReservation, clientName, sportId  ,terrain) => {
  try {

    // 1. Authentifier auprès de VAMOS
    const accessToken = await authenticateVamos();

    // 2. Récupérer tous les slots avec sportId dynamique
    const response = await axios.get(
      `${VAMOS_CONFIG.baseUrl}/slots/facility/${VAMOS_CONFIG.facilityId}/sport/${sportId}?coachingAcademy=false&fullHistory=false`,
      {
        headers: {
          'X-Client-Id': VAMOS_CONFIG.clientId,
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    // console.log("allSlots" , response.data)

    const allSlots = response.data;

    // 3. Trouver le slot correspondant à la dateDeReservation (status = 0)
    const targetSlot = allSlots.find(slot => {
      return slot.endTime === dateDeReservation && slot.text.charAt(VAMOS_CONFIG.terrainCharAt) ===  terrain.charAt(1)  && slot.status === 0;
    });

    if (!targetSlot) {
      
      return {
        success: false,
        error: `Aucun slot libre trouvé sur VAMOS pour la date ${dateDeReservation}`,
        slotId: null,
        sportId: sportId
      };
    }


    // 4. Réserver le slot via l'API VAMOS
    const bookingResponse = await axios.put(
      `${VAMOS_CONFIG.baseUrl}/facilities/${VAMOS_CONFIG.facilityId}/slots/${targetSlot.slotId}`,
      {
        status: 1,
        clientName: clientName || "Client non spécifié",
        until: dateDeReservation
      },
      {
        headers: {
          'X-Client-Id': VAMOS_CONFIG.clientId,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (bookingResponse.status === 204) {
      return {
        success: true,
        slotId: targetSlot.slotId,
        sportId: sportId,
        message: "Slot réservé avec succès sur VAMOS"
      };
    } else {
      return {
        success: false,
        error: `Échec de la réservation VAMOS (status: ${bookingResponse.status})`,
        slotId: null,
        sportId: sportId
      };
    }

  } catch (error) {
    console.error('❌ Erreur lors de la réservation VAMOS:', error.message);
    console.error('Détails:', error.response?.data || error.message);
    
    return {
      success: false,
      error: `Erreur VAMOS: ${error.message}`,
      slotId: null,
      sportId: sportId || null
    };
  }
};

export const addNewReservation = async (req, res) => {
  try {
    const { 
      idEmplacement, 
      terrain, 
      type, 
      jour, 
      creneau, 
      client,
      telephone,
      remarque,
      avance = 0,
      prixTotal = 0,
      type_paiement = 'espece',
      numero_compte = null,
      date_dechiance = null,
      nom = null,
      banque = null,
      dateDeReservation,
      sportId
    } = req.body;

    
    const statut = 'réservé';
    
    // VÉRIFICATION : Si client est vide, on rejette la requête
    if (!client || client.trim() === "") {
      return res.status(400).json({ 
        message: 'Le nom du client est obligatoire pour créer une réservation',
        error: 'CLIENT_REQUIRED'
      });
    }
    
    // Convertir la date ISO en format MySQL DATE (YYYY-MM-DD)
    let formattedDate = null;
    if (date_dechiance) {
      const date = new Date(date_dechiance);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      }
    }

    // Étape 1: Tenter de réserver le slot VAMOS (client est forcément rempli ici)
    let vamosResult = null;
    if (dateDeReservation) {
      try {
        vamosResult = await reserveVamosSlot(dateDeReservation, client , sportId , terrain);
        
      } catch (vamosError) {
        console.error('Erreur lors de la réservation VAMOS:', vamosError);
        // On continue avec la création locale malgré l'erreur VAMOS
      }
    } else {
      console.log('⏭️ Pas de réservation VAMOS: dateDeReservation manquante');
    }

    // Étape 2: Créer la réservation dans notre base de données
    const [result] = await pool.execute(
      `INSERT INTO reservation 
      (idEmplacement, terrain, type, jour, creneau, client, telephone, remarque, statut, avance, prixTotal, type_paiement, numero_compte, date_dechiance, nom, banque) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idEmplacement, terrain, type, jour, creneau, client, telephone, remarque, statut, avance, prixTotal, type_paiement, numero_compte, formattedDate, nom, banque]
    );
    
    // Étape 3: Retourner la réponse avec les informations VAMOS
    const responseData = {
      id: result.insertId,
      idEmplacement,
      terrain,
      type,
      jour,
      creneau,
      client,
      telephone,
      remarque,
      statut,
      avance,
      prixTotal,
      type_paiement,
      numero_compte,
      date_dechiance: formattedDate,
      nom,
      banque
    };

    // Ajouter les informations VAMOS à la réponse
    if (vamosResult) {
      responseData.vamosReservation = {
        success: vamosResult.success,
        slotId: vamosResult.slotId,
        message: vamosResult.message || vamosResult.error,
        dateDeReservation
      };
    }

    res.status(201).json(responseData);
  } catch (err) {
    // Gestion des erreurs
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        message: 'Ce créneau est déjà réservé',
        vamosReservation: vamosResult ? {
          success: vamosResult.success,
          slotId: vamosResult.slotId,
          message: vamosResult.message || vamosResult.error
        } : null
      });
    }
    
    console.error('Erreur lors de la création de la réservation:', err);
    
    // Retourner l'erreur avec les informations VAMOS si disponibles
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: err.message,
      vamosReservation: vamosResult ? {
        success: vamosResult.success,
        slotId: vamosResult.slotId,
        message: vamosResult.message || vamosResult.error
      } : null
    });
  }
};

export const getSynchronization = async (req, res) => {
  console.log("data111111" , req.body)

}

// Dupliquer une réservation (modifié)
export const addDupliquer = async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { reservationId } = req.params;
    const { dateFin } = req.body; // Date de fin reçue dans le body

    // Validation de la date de fin
    if (!dateFin) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'La date de fin est requise'
      });
    }

    const endDate = new Date(dateFin);
    if (isNaN(endDate.getTime())) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide'
      });
    }

    const [reservations] = await conn.query(
      'SELECT * FROM reservation WHERE id = ?',
      [reservationId]
    );

    if (reservations.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    const originalReservation = reservations[0];
    const originalDate = new Date(originalReservation.jour.split(' ')[1].split('/').reverse().join('-')).toISOString();

    function formatFrenchDate(date) {
      const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const dayName = days[date.getDay()];
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${dayName} ${day}/${month}/${year}`;
    }

    const allDates = [];
    let currentDate = new Date(originalDate);
    currentDate.setDate(currentDate.getDate() + 7); // Commence une semaine après la date originale
    
    // Générer les dates jusqu'à la date de fin spécifiée
    while (currentDate <= endDate) {
      allDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7); // Ajoute 7 jours à chaque itération
    }

    const createdReservations = [];
    for (const date of allDates) {
      const formattedDate = formatFrenchDate(date);
      
      const [existing] = await conn.query(
        'SELECT id FROM reservation WHERE idEmplacement = ? AND terrain = ? AND jour = ? AND creneau = ?',
        [
          originalReservation.idEmplacement,
          originalReservation.terrain,
          formattedDate,
          originalReservation.creneau
        ]
      );

      if (existing.length === 0) {
        const [newReservation] = await conn.execute(
          'INSERT INTO reservation (idEmplacement, terrain, type, jour, creneau, client, telephone, remarque, statut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            originalReservation.idEmplacement,
            originalReservation.terrain,
            originalReservation.type,
            formattedDate,
            originalReservation.creneau,
            originalReservation.client,
            originalReservation.telephone,
            originalReservation.remarque,
            originalReservation.statut || 'réservé'
          ]
        );

        if (originalReservation.group_id) {
          await conn.execute(
            'INSERT INTO group_adherent (group_id, reservation_id) VALUES (?, ?)',
            [originalReservation.group_id, newReservation.insertId]
          );
        }

        createdReservations.push({
          id: newReservation.insertId,
          date: formattedDate,
          creneau: originalReservation.creneau
        });
      }
    }

    await conn.commit();
    
    res.status(201).json({
      success: true,
      message: `Réservation dupliquée tous les 7 jours jusqu'au ${formatFrenchDate(endDate)}`,
      originalReservation: {
        id: originalReservation.id,
        jour: formatFrenchDate(new Date(originalDate)),
        jourOriginal: originalReservation.jour,
        creneau: originalReservation.creneau,
        client: originalReservation.client,
        telephone: originalReservation.telephone,
        remarque: originalReservation.remarque
      },
      createdReservations,
      totalDatesGenerated: allDates.length,
      dateDebut: formatFrenchDate(new Date(originalDate)),
      dateFin: formatFrenchDate(endDate)
    });

  } catch (err) {
    await conn.rollback();
    console.error('Erreur dans addDupliquer:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la duplication',
      error: err.message,
      code: err.code
    });
  } finally {
    conn.release();
  }
};

// Fonction pour libérer un slot VAMOS
const freeVamosSlot = async (slotId, dateDeReservation, sportId ) => {
  try {

    // 1. Authentifier auprès de VAMOS
    const accessToken = await authenticateVamos();

    // 2. Libérer le slot via l'API VAMOS (même requête mais status: 0)
    const response = await axios.put(
      `${VAMOS_CONFIG.baseUrl}/facilities/${VAMOS_CONFIG.facilityId}/slots/${slotId}`,
      {
        status: 0, // ← Changé de 1 à 0 pour libérer le slot
        clientName: "", // Nom vide car slot libéré
        until: dateDeReservation
      },
      {
        headers: {
          'X-Client-Id': VAMOS_CONFIG.clientId,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 204) {
      return {
        success: true,
        slotId: slotId,
        sportId: sportId,
        message: "Slot libéré avec succès sur VAMOS"
      };
    } else {
      return {
        success: false,
        error: `Échec de la libération VAMOS (status: ${response.status})`,
        slotId: null,
        sportId: sportId
      };
    }

  } catch (error) {
    console.error('❌ Erreur lors de la libération VAMOS:', error.message);
    console.error('Détails:', error.response?.data || error.message);
    
    return {
      success: false,
      error: `Erreur VAMOS: ${error.message}`,
      slotId: null,
      sportId: sportId || null
    };
  }
};

// Supprimer une réservation
export const deleteReservation = async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { id } = req.params;
    const { idEmplacement, dateDeReservation , sportId , terrain} = req.query; // ← Ajout de dateDeReservation

    // Récupérer les informations de la réservation avant suppression pour VAMOS
    const [reservationInfo] = await conn.execute(
      'SELECT client, id FROM reservation WHERE id = ?',
      [id]
    );
    
    if (reservationInfo.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    
    const reservation = reservationInfo[0];
    
    // Étape 1: Tenter de libérer le slot VAMOS
    let vamosResult = null;
    if (dateDeReservation && reservation.client) {
      try {
        
        // Trouver le slot ID correspondant à cette date
        const accessToken = await authenticateVamos();
        const slotsResponse = await axios.get(
          `${VAMOS_CONFIG.baseUrl}/slots/facility/${VAMOS_CONFIG.facilityId}/sport/${sportId}?coachingAcademy=false&fullHistory=false`,
          {
            headers: {
              'X-Client-Id': VAMOS_CONFIG.clientId,
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        // Trouver le slot réservé par ce client à cette date
        const targetSlot = slotsResponse.data.find(slot => 
          slot.text.charAt(VAMOS_CONFIG.terrainCharAt) ===  terrain.charAt(1) &&
          slot.endTime === dateDeReservation && 
          slot.status === 1
        );
        
        if (targetSlot) {
          vamosResult = await freeVamosSlot(targetSlot.slotId, dateDeReservation ,sportId);
          
        } 
      } catch (vamosError) {
        console.error('Erreur lors de la libération VAMOS:', vamosError);
        // On continue avec la suppression locale malgré l'erreur VAMOS
      }
    } else {
      console.log('⚠️ Impossible de libérer VAMOS: dateDeReservation ou client manquant');
    }

    // Étape 2: Supprimer la réservation locale
    // Supprime toutes les entrées de reservation_aderent avec ce reservation_id
    await conn.execute(
      'DELETE FROM reservation_aderent WHERE reservation_id = ?',
      [id]
    );
    
    // Supprime la réservation principale
    const [result] = await conn.execute(
      'DELETE FROM reservation WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    
    await conn.commit();
    
    // Étape 3: Retourner la réponse
    const responseData = { 
      message: 'Réservation et relations annulées avec succès',
      id: parseInt(id)
    };
    
    // Ajouter les informations VAMOS à la réponse
    if (vamosResult) {
      responseData.vamosLiberation = {
        success: vamosResult.success,
        slotId: vamosResult.slotId,
        message: vamosResult.message || vamosResult.error,
        dateDeReservation
      };
    }
    
    if (idEmplacement) {
      responseData.idEmplacement = idEmplacement;
    }
    
    res.json(responseData);
  } catch (err) {
    await conn.rollback();
    console.error('Erreur lors de la suppression:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la suppression',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    conn.release();
  }
};

// Récupérer toutes les réservations (modifié avec banque)
export const getAllReservation = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id, 
        idEmplacement, 
        terrain, 
        jour, 
        creneau, 
        client,
        telephone,
        remarque,
        type, 
        statut,
        avance,
        prixTotal,
        type_paiement,
        numero_compte,
        date_dechiance,
        nom,
        banque,
        created_at,
        updated_at
      FROM reservation
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer les réservations par nom (modifié avec banque)
export const getAllReservationsByName = async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name || name.length < 2) {
      return res.json([]);
    }

    const searchTerm = `%${name}%`;

    const [rows] = await pool.query(`
      SELECT DISTINCT
        client,
        telephone,
        remarque,
        avance,
        prixTotal,
        type_paiement,
        numero_compte,
        date_dechiance,
        nom,
        banque,
        COUNT(*) as reservation_count
      FROM reservation 
      WHERE (client LIKE ? OR telephone LIKE ?)
        AND type = 'passager'
      GROUP BY client, telephone, remarque, avance, prixTotal, type_paiement, numero_compte, date_dechiance, nom, banque
      ORDER BY 
        CASE 
          WHEN client = ? THEN 0 
          WHEN client LIKE ? THEN 1 
          ELSE 2 
        END,
        reservation_count DESC,
        client ASC
      LIMIT 10
    `, [searchTerm, searchTerm, name, `${name}%`]);

    res.json(rows);
  } catch (err) {
    console.error('Erreur lors de la recherche des clients:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la recherche des clients' });
  }
};

// Modifier la fonction updateReservationRes pour ne pas modifier l'avance manuellement
export const updateReservationRes = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      client, 
      telephone,
      remarque,
      type, 
      statut,
      prixTotal,  // On garde prixTotal modifiable
      type_paiement,
      numero_compte,
      date_dechiance,
      nom,
      banque
      // On retire 'avance' des paramètres modifiables
    } = req.body;
    
    // Récupérer d'abord la réservation existante pour conserver les valeurs si elles ne sont pas fournies
    const [existingReservation] = await pool.query(
      'SELECT prixTotal, type_paiement, numero_compte, date_dechiance, nom, banque, avance FROM reservation WHERE id = ?',
      [id]
    );
    
    if (existingReservation.length === 0) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    
    // Utiliser les nouvelles valeurs si fournies, sinon conserver les anciennes
    // L'avance n'est plus modifiable manuellement, on garde l'ancienne valeur
    const finalPrixTotal = prixTotal !== undefined ? prixTotal : (existingReservation[0]?.prixTotal || 0);
    const finalTypePaiement = type_paiement !== undefined ? type_paiement : (existingReservation[0]?.type_paiement || 'espece');
    const finalNumeroCompte = numero_compte !== undefined ? numero_compte : existingReservation[0]?.numero_compte;
    const finalNom = nom !== undefined ? nom : existingReservation[0]?.nom;
    const finalBanque = banque !== undefined ? banque : existingReservation[0]?.banque;
    // L'avance reste inchangée (calculée automatiquement à partir des versements)
    const finalAvance = existingReservation[0]?.avance || 0;
    
    // Convertir la date ISO en format MySQL DATE (YYYY-MM-DD)
    let finalDateDechiance = existingReservation[0]?.date_dechiance;
    if (date_dechiance !== undefined) {
      if (date_dechiance === null || date_dechiance === '') {
        finalDateDechiance = null;
      } else {
        const date = new Date(date_dechiance);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          finalDateDechiance = `${year}-${month}-${day}`;
        }
      }
    }

    const [result] = await pool.execute(
      `UPDATE reservation 
       SET 
         client = ?, 
         telephone = ?,
         remarque = ?,
         type = ?, 
         statut = ?,
         prixTotal = ?,
         type_paiement = ?,
         numero_compte = ?,
         date_dechiance = ?,
         nom = ?,
         banque = ?,
         avance = ?
       WHERE id = ?`,
      [
        client, 
        telephone, 
        remarque, 
        type, 
        statut, 
        finalPrixTotal,
        finalTypePaiement,
        finalNumeroCompte,
        finalDateDechiance,
        finalNom,
        finalBanque,
        finalAvance,  // Avance gardée inchangée
        id
      ]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    
    // Récupérer la réservation mise à jour
    const [updatedReservation] = await pool.query(
      'SELECT * FROM reservation WHERE id = ?',
      [id]
    );
    
    res.json(updatedReservation[0]);
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la réservation:', err);
    
    if (err.code === 'ER_TRUNCATED_WRONG_VALUE') {
      return res.status(400).json({ message: 'Format de date incorrect' });
    }
    
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la réservation' });
  }
};

// Récupérer les réservations par emplacement (nouveau)
export const getReservationsByEmplacement = async (req, res) => {
  try {
    const { idEmplacement } = req.query;
    
    const [rows] = await pool.query(`
      SELECT 
        id,
        idEmplacement,
        terrain,
        jour,
        creneau,
        client,
        telephone,
        remarque,
        type,
        statut,
        avance,
        prixTotal
      FROM reservation
      WHERE idEmplacement = ?
      ORDER BY jour, creneau
    `, [idEmplacement]);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};



// Modifier un versement existant
export const updateVersement = async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { id } = req.params;
    const {
      montant_verse,
      type_paiement_verse,
      banque,
      numero_compte,
      details_versement
    } = req.body;

    // Validation des données requises
    if (!montant_verse || montant_verse <= 0) {
      await conn.rollback();
      return res.status(400).json({ 
        message: 'Le montant_verse (positif) est requis' 
      });
    }

    // Vérifier que le versement existe
    const [versement] = await conn.query(
      'SELECT * FROM historique_versements_pass WHERE id = ?',
      [id]
    );

    if (versement.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Versement non trouvé' });
    }

    const reservation_id = versement[0].reservation_id;
    const nouveauMontantVerse = parseFloat(montant_verse);

    // Vérifier que la réservation existe
    const [reservation] = await conn.query(
      'SELECT prixTotal FROM reservation WHERE id = ?',
      [reservation_id]
    );

    if (reservation.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    const prixTotal = parseFloat(reservation[0].prixTotal);

    // Vérifier que le montant ne dépasse pas le prix total
    if (nouveauMontantVerse > prixTotal) {
      await conn.rollback();
      return res.status(400).json({ 
        message: `Le montant du versement (${nouveauMontantVerse} DT) ne peut pas dépasser le prix total (${prixTotal} DT)` 
      });
    }

    // Mettre à jour le versement
    const [result] = await conn.execute(
      `UPDATE historique_versements_pass 
       SET 
         montant_verse = ?,
         type_paiement_verse = ?,
         banque = ?,
         numero_compte = ?,
         details_versement = ?
       WHERE id = ?`,
      [
        nouveauMontantVerse,
        type_paiement_verse || 'espece',
        banque || null,
        numero_compte || null,
        details_versement || null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Versement non trouvé' });
    }

    // Recalculer la nouvelle avance totale
    const [versements] = await conn.query(
      'SELECT SUM(montant_verse) as total_verse FROM historique_versements_pass WHERE reservation_id = ?',
      [reservation_id]
    );

    const nouvelleAvance = parseFloat(versements[0].total_verse) || 0;

    // Mettre à jour l'avance dans la réservation
    await conn.execute(
      'UPDATE reservation SET avance = ? WHERE id = ?',
      [nouvelleAvance, reservation_id]
    );

    await conn.commit();

    // Récupérer le versement mis à jour
    const [versementMisAJour] = await conn.query(
      'SELECT * FROM historique_versements_pass WHERE id = ?',
      [id]
    );

    res.status(200).json({
      message: 'Versement modifié avec succès',
      versement: versementMisAJour[0],
      nouvelle_avance: nouvelleAvance
    });

  } catch (err) {
    await conn.rollback();
    console.error('Erreur lors de la modification du versement:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la modification du versement',
      error: err.message 
    });
  } finally {
    conn.release();
  }
};

// Supprimer un versement
export const deleteVersement = async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { id } = req.params;

    // Vérifier que le versement existe et récupérer reservation_id
    const [versement] = await conn.query(
      'SELECT reservation_id FROM historique_versements_pass WHERE id = ?',
      [id]
    );

    if (versement.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Versement non trouvé' });
    }

    const reservation_id = versement[0].reservation_id;

    // Supprimer le versement
    const [result] = await conn.execute(
      'DELETE FROM historique_versements_pass WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Versement non trouvé' });
    }

    // Recalculer la nouvelle avance totale
    const [versements] = await conn.query(
      'SELECT SUM(montant_verse) as total_verse FROM historique_versements_pass WHERE reservation_id = ?',
      [reservation_id]
    );

    const nouvelleAvance = parseFloat(versements[0].total_verse) || 0;

    // Mettre à jour l'avance dans la réservation
    await conn.execute(
      'UPDATE reservation SET avance = ? WHERE id = ?',
      [nouvelleAvance, reservation_id]
    );

    await conn.commit();

    res.status(200).json({
      message: 'Versement supprimé avec succès',
      reservation_id: reservation_id,
      nouvelle_avance: nouvelleAvance
    });

  } catch (err) {
    await conn.rollback();
    console.error('Erreur lors de la suppression du versement:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la suppression du versement',
      error: err.message 
    });
  } finally {
    conn.release();
  }
};

// Supprimer un emplacement (inchangé)
export const deleteEmplacement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteEmplacementModel(id);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Emplacement non trouvé' });
    }
    
    res.json({ 
      message: 'Emplacement et ses réservations associées supprimés avec succès',
      reservationsDeleted: result.reservationsDeleted 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de l\'emplacement et de ses réservations',
      details: error.message 
    });
  }
};

// Créer un nouveau versement
export const createVersement = async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const {
      reservation_id,
      montant_verse,
      type_paiement_verse,
      banque,
      numero_compte,
      details_versement
    } = req.body;

    // Validation des données requises
    if (!reservation_id || !montant_verse || montant_verse <= 0) {
      await conn.rollback();
      return res.status(400).json({ 
        message: 'Les champs reservation_id et montant_verse (positif) sont requis' 
      });
    }

    // Vérifier que la réservation existe
    const [reservation] = await conn.query(
      'SELECT id, prixTotal, avance FROM reservation WHERE id = ?',
      [reservation_id]
    );

    if (reservation.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    const currentReservation = reservation[0];
    const nouveauMontantVerse = parseFloat(montant_verse);

    // Vérifier que le montant ne dépasse pas le prix total
    if (nouveauMontantVerse > currentReservation.prixTotal) {
      await conn.rollback();
      return res.status(400).json({ 
        message: `Le montant du versement (${nouveauMontantVerse} DT) ne peut pas dépasser le prix total (${currentReservation.prixTotal} DT)` 
      });
    }

    // Insérer le nouveau versement
    const [result] = await conn.execute(
      `INSERT INTO historique_versements_pass 
      (reservation_id, montant_verse, type_paiement_verse, banque, numero_compte, details_versement) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        reservation_id,
        nouveauMontantVerse,
        type_paiement_verse || 'espece',
        banque || null,
        numero_compte || null,
        details_versement || null
      ]
    );

    // Calculer la nouvelle avance totale
    const [versements] = await conn.query(
      'SELECT SUM(montant_verse) as total_verse FROM historique_versements_pass WHERE reservation_id = ?',
      [reservation_id]
    );

    const nouvelleAvance = parseFloat(versements[0].total_verse) || 0;

    // Mettre à jour l'avance dans la réservation
    await conn.execute(
      'UPDATE reservation SET avance = ? WHERE id = ?',
      [nouvelleAvance, reservation_id]
    );

    await conn.commit();

    // Récupérer le versement créé
    const [nouveauVersement] = await conn.query(
      'SELECT * FROM historique_versements_pass WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Versement ajouté avec succès',
      versement: nouveauVersement[0],
      nouvelle_avance: nouvelleAvance
    });

  } catch (err) {
    await conn.rollback();
    console.error('Erreur lors de la création du versement:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la création du versement',
      error: err.message 
    });
  } finally {
    conn.release();
  }
};

// Récupérer les versements d'une réservation
export const getVersementsByReservation = async (req, res) => {
  try {
    const { reservation_id } = req.params;

    const [versements] = await pool.query(
      `SELECT 
        id,
        reservation_id,
        montant_verse,
        date_versement,
        type_paiement_verse,
        banque,
        numero_compte,
        details_versement
      FROM historique_versements_pass 
      WHERE reservation_id = ?
      ORDER BY date_versement DESC`,
      [reservation_id]
    );

    res.json(versements);
  } catch (err) {
    console.error('Erreur lors de la récupération des versements:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération des versements',
      error: err.message 
    });
  }
};

// Mettre à jour l'avance d'une réservation à partir des versements
export const updateAvanceFromVersements = async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { id } = req.params;

    // Vérifier que la réservation existe
    const [reservation] = await conn.query(
      'SELECT id FROM reservation WHERE id = ?',
      [id]
    );

    if (reservation.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    // Calculer la somme totale des versements
    const [versements] = await conn.query(
      'SELECT SUM(montant_verse) as total_verse FROM historique_versements_pass WHERE reservation_id = ?',
      [id]
    );

    const totalAvance = parseFloat(versements[0].total_verse) || 0;

    // Mettre à jour l'avance dans la réservation
    await conn.execute(
      'UPDATE reservation SET avance = ? WHERE id = ?',
      [totalAvance, id]
    );

    await conn.commit();

    res.status(200).json({
      message: 'Avance mise à jour avec succès',
      reservation_id: id,
      nouvelle_avance: totalAvance
    });

  } catch (err) {
    await conn.rollback();
    console.error('Erreur lors de la mise à jour de l\'avance:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la mise à jour de l\'avance',
      error: err.message 
    });
  } finally {
    conn.release();
  }
};



// Ajouter un adhérent à une réservation (inchangé)
// export const addAdherentToReservation = async (req, res) => {
//   const conn = await pool.getConnection();
//   await conn.beginTransaction();

//   try {
//     const { reservationId, adherentId , groupId, courId } = req.params;
//     const { present = false } = req.body;

//     const [[reservation], [adherent], [existingRelation]] = await Promise.all([
//       conn.query('SELECT id FROM reservation WHERE id = ?', [reservationId]),
//       conn.query('SELECT id FROM adherents WHERE id = ?', [adherentId]),
//       conn.query('SELECT id FROM ecoles WHERE id = ?', [groupId]),
//       conn.query('SELECT id FROM cours WHERE id = ?', [courId]),
//       conn.query(
//         'SELECT * FROM reservation_aderent WHERE reservation_id = ? AND aderent_id = ?',
//         [reservationId, adherentId]
//       )
//     ]);

//     if (!reservation.length) {
//       await conn.rollback();
//       return res.status(404).json({ message: 'Réservation non trouvée' });
//     }

//     if (!adherent.length) {
//       await conn.rollback();
//       return res.status(404).json({ message: 'Adhérent non trouvé' });
//     }

//     if (!groupId.length) {
//       await conn.rollback();
//       return res.status(404).json({ message: 'Groupe non trouvé' });
//     }

//     if (!courId.length) {
//       await conn.rollback();
//       return res.status(404).json({ message: 'Cour non trouvé' });
//     }

//     if (existingRelation.length) {
//       await conn.execute(
//         'UPDATE reservation_aderent SET present = ? WHERE reservation_id = ? AND aderent_id = ? AND group_id = ? AND cour_id = ?',
//         [present, reservationId, adherentId, groupId, courId]
//       );
//     } else {
//       await conn.execute(
//         'INSERT INTO reservation_aderent (reservation_id, aderent_id, group_id, cour_id, present) VALUES (?, ?, ?, ?, ?)',
//         [reservationId, adherentId, groupId, courId, present]
//       );
//     }

//     await conn.commit();
    
//     res.status(existingRelation.length ? 200 : 201).json({ 
//       message: existingRelation.length 
//         ? 'Présence mise à jour' 
//         : 'Adhérent ajouté à la réservation',
//       reservationId,
//       adherentId,
//       present
//     });
//   } catch (err) {
//     await conn.rollback();
//     console.error(err);
//     res.status(500).json({ 
//       message: 'Erreur serveur',
//       error: err.message,
//       code: err.code
//     });
//   } finally {
//     conn.release();
//   }
// };

export const updateAdherentPresence = async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { reservationId, adherentId, groupId, courId } = req.params;
    const { present = false } = req.body;

    // Vérifier l'existence des entités
    const [[reservation], [adherent], [cour], [group], [existingRelation]] = await Promise.all([
      conn.query('SELECT id FROM reservation WHERE id = ?', [reservationId]),
      conn.query('SELECT id FROM adherents WHERE id = ?', [adherentId]),
      conn.query('SELECT id FROM ecoles WHERE id = ?', [courId]),
      conn.query('SELECT id FROM `groups` WHERE id = ?', [groupId]),
      conn.query(
        'SELECT * FROM reservation_aderent WHERE reservation_id = ? AND aderent_id = ? AND group_id = ? AND cour_id = ?',
        [reservationId, adherentId, groupId, courId]
      )
    ]);

    // Validations
    if (!reservation.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    if (!adherent.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Adhérent non trouvé' });
    }

    if (!group.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    if (!cour.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Cours non trouvé' });
    }

    let result;
    let message;
    let statusCode;

    if (existingRelation.length) {
      // Mise à jour si la relation existe déjà (PUT)
      result = await conn.execute(
        'UPDATE reservation_aderent SET present = ? WHERE reservation_id = ? AND aderent_id = ? AND group_id = ? AND cour_id = ?',
        [present, reservationId, adherentId, groupId, courId]
      );
      message = 'Présence mise à jour avec succès';
      statusCode = 200;
    } else {
      // Création d'une nouvelle relation si elle n'existe pas (POST)
      result = await conn.execute(
        'INSERT INTO reservation_aderent (reservation_id, aderent_id, group_id, cour_id, present, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [reservationId, adherentId, groupId, courId, present]
      );
      message = 'Adhérent ajouté à la réservation avec succès';
      statusCode = 201;
    }

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Aucune ligne affectée lors de l\'opération' });
    }

    await conn.commit();
    
    res.status(statusCode).json({ 
      message,
      reservationId,
      adherentId,
      groupId,
      courId,
      present,
      affectedRows: result.affectedRows,
      operation: existingRelation.length ? 'UPDATE' : 'CREATE'
    });

  } catch (err) {
    await conn.rollback();
    console.error('Erreur lors de la gestion de la présence:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'opération',
      error: err.message,
      code: err.code
    });
  } finally {
    conn.release();
  }
};

// Récupérer les adhérents d'une réservation (inchangé)
export const getReservationAdherents = async (req, res) => {
  try {
    const { reservationId } = req.params;

    const [results] = await pool.query(
      `SELECT a.id, a.nom, a.prenom, a.email, a.role, a.phone, ra.present
       FROM adherents a
       JOIN reservation_aderent ra ON a.id = ra.aderent_id
       WHERE ra.reservation_id = ?`,
      [reservationId]
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateCoachPresence = async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const { reservationId, coachesId, groupId, courId } = req.params;
    const { present = false } = req.body;

    // Vérifier l'existence des entités
    const [[reservation], [coach], [cour], [group], [existingRelation]] = await Promise.all([
      conn.query('SELECT id FROM reservation WHERE id = ?', [reservationId]),
      conn.query('SELECT id FROM coaches WHERE id = ?', [coachesId]),
      conn.query('SELECT id FROM ecoles WHERE id = ?', [courId]),
      conn.query('SELECT id FROM `groups` WHERE id = ?', [groupId]),
      conn.query(
        'SELECT * FROM reservation_coach WHERE reservation_id = ? AND coach_id = ? AND group_id = ? AND cour_id = ?',
        [reservationId, coachesId, groupId, courId]
      )
    ]);

    // Validations
    if (!reservation.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    if (!coach.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Coach non trouvé' });
    }

    if (!group.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    if (!cour.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Cours non trouvé' });
    }

    let result;
    let message;
    let statusCode;

    if (existingRelation.length) {
      // Mise à jour si la relation existe déjà (PUT)
      result = await conn.execute(
        'UPDATE reservation_coach SET present = ? WHERE reservation_id = ? AND coach_id = ? AND group_id = ? AND cour_id = ?',
        [present, reservationId, coachesId, groupId, courId]
      );
      message = 'Présence coach mise à jour avec succès';
      statusCode = 200;
    } else {
      // Création d'une nouvelle relation si elle n'existe pas
      result = await conn.execute(
        'INSERT INTO reservation_coach (reservation_id, coach_id, group_id, cour_id, present, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [reservationId, coachesId, groupId, courId, present]
      );
      message = 'Coach ajouté à la réservation avec succès';
      statusCode = 201;
    }

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Aucune ligne affectée lors de l\'opération' });
    }

    await conn.commit();
    
    res.status(statusCode).json({ 
      message,
      reservationId,
      coachId: coachesId,
      groupId,
      courId,
      present,
      affectedRows: result.affectedRows,
      operation: existingRelation.length ? 'UPDATE' : 'CREATE'
    });

  } catch (err) {
    await conn.rollback();
    console.error('Erreur lors de la gestion de la présence coach:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'opération',
      error: err.message,
      code: err.code
    });
  } finally {
    conn.release();
  }
};

// Récupérer les coachs d'une réservation
export const getReservationCoaches = async (req, res) => {
  try {
    const { reservationId } = req.params;

    const [results] = await pool.query(
      `SELECT 
        c.id, 
        c.nom, 
        c.prenom, 
        c.email, 
        c.phone,
        c.salary_type,
        c.hourly_rate,
        c.commission_rate,
        rc.present,
        rc.group_id,
        rc.cour_id
       FROM coaches c
       JOIN reservation_coach rc ON c.id = rc.coach_id
       WHERE rc.reservation_id = ?`,
      [reservationId]
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Version avec filtres groupe et cours
export const getReservationCoachesByGroupAndCour = async (req, res) => {
  try {
    const { reservationId, groupId, courId } = req.params;

    const [results] = await pool.query(
      `SELECT 
        c.id, 
        c.nom, 
        c.prenom, 
        c.email, 
        c.phone,
        c.salary_type,
        c.hourly_rate,
        c.commission_rate,
        rc.present,
        rc.group_id,
        rc.cour_id,
        rc.created_at as presence_created_at
       FROM coaches c
       JOIN reservation_coach rc ON c.id = rc.coach_id
       WHERE rc.reservation_id = ? 
         AND rc.group_id = ? 
         AND rc.cour_id = ?`,
      [reservationId, groupId, courId]
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Modifier la présence d'un adhérent dans une réservation (inchangé)
// export const updateAdherentPresence = async (req, res) => {
//   try {
//     const { reservationId, adherentId } = req.params;
//     const { present } = req.body;

//     if (typeof present !== 'boolean') {
//       return res.status(400).json({ message: 'Le champ present doit être un booléen' });
//     }

//     const [existingRelation] = await pool.query(
//       'SELECT * FROM reservation_aderent WHERE reservation_id = ? AND aderent_id = ?',
//       [reservationId, adherentId]
//     );

//     if (existingRelation.length === 0) {
//       return res.status(404).json({ message: 'Relation réservation-adhérent non trouvée' });
//     }

//     await pool.execute(
//       'UPDATE reservation_aderent SET present = ? WHERE reservation_id = ? AND aderent_id = ?',
//       [present, reservationId, adherentId]
//     );

//     res.json({ 
//       message: 'Présence mise à jour avec succès',
//       reservationId,
//       adherentId,
//       present
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Erreur serveur' });
//   }
// };

// Récupérer les statistiques de présence pour un groupe (inchangé)
export const getGroupPresenceStats = async (req, res) => {
  try {
    const { groupId , courId} = req.params;
    const [results] = await pool.query(`
      SELECT 
        DATE(r.jour) as date,
        COUNT(ra.aderent_id) as presenceCount,
        r.jour as fullDate,
        r.jour as jour,
        r.creneau as creneau,
        CONCAT(r.jour, ' ', r.creneau) as jour_creneau
      FROM reservation r
      JOIN reservation_aderent ra ON r.id = ra.reservation_id
      JOIN group_adherent ga ON ra.aderent_id = ga.adherent_id
      WHERE ga.group_id = ? AND ra.present = 1
      GROUP BY DATE(r.jour), r.jour, r.creneau
      ORDER BY r.jour ASC
    `, [groupId , courId]);


    const formattedResults = results.map(item => ({
      date: new Date(item.fullDate).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }),
      presenceCount: item.presenceCount,
      jour: item.jour,
      creneau: item.creneau,
      label: `${item.jour} ${item.creneau}`
    }));

    res.json(formattedResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: err.message 
    });
  }
};

