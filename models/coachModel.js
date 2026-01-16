import pool from '../config/db.js';

class Coach {

  
    static async findByEmail(email) {
    const query = 'SELECT * FROM coaches WHERE email = ?';
    const [rows] = await pool.execute(query, [email]);
    return rows[0] || null; // Retourne le premier coach trouvé ou null
  }


  // Créer un coach
  static async create(coach) {
    const query = `INSERT INTO coaches (nom, prenom, email, phone, password, salary_type, hourly_rate, commission_rate, created_at, updated_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    const [result] = await pool.execute(query, [
      coach.nom, 
      coach.prenom, 
      coach.email, 
      coach.phone, 
      coach.password,
      coach.salary_type, 
      coach.hourly_rate, 
      coach.commission_rate
    ]);
    return result;
  }

    // Mettre à jour un coach
  static async update(id, coach) {
    // Mettre à jour avec mot de passe
    let query = '';
    let params = [];
    
    if (coach.password) {
      // Si un nouveau mot de passe est fourni
      query = `UPDATE coaches 
               SET nom = ?, prenom = ?, email = ?, phone = ?, password = ?, 
                   salary_type = ?, hourly_rate = ?, commission_rate = ?, updated_at = NOW()
               WHERE id = ?`;
      params = [
        coach.nom, 
        coach.prenom, 
        coach.email, 
        coach.phone, 
        coach.password,
        coach.salary_type, 
        coach.hourly_rate, 
        coach.commission_rate, 
        id
      ];
    } else {
      // Si aucun nouveau mot de passe n'est fourni, ne pas modifier le mot de passe existant
      query = `UPDATE coaches 
               SET nom = ?, prenom = ?, email = ?, phone = ?, 
                   salary_type = ?, hourly_rate = ?, commission_rate = ?, updated_at = NOW()
               WHERE id = ?`;
      params = [
        coach.nom, 
        coach.prenom, 
        coach.email, 
        coach.phone,
        coach.salary_type, 
        coach.hourly_rate, 
        coach.commission_rate, 
        id
      ];
    }
    
    const [result] = await pool.execute(query, params);
    return result;
  }

  // Récupérer tous les coaches
  static async getAll() {
    const query = 'SELECT * FROM coaches';
    const [rows] = await pool.execute(query);
    return rows;
  }

  // Récupérer tous les noms et prénoms des coaches
  static async getAllNames() {
    const query = 'SELECT CONCAT(prenom, " ", nom) AS full_name FROM coaches ORDER BY nom, prenom';
    const [rows] = await pool.execute(query);
    return rows.map(row => row.full_name);
  }

  // Récupérer un coach par ID
  static async getById(id) {
    const query = 'SELECT * FROM coaches WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0]; // Retourner le premier coach trouvé
  }



  // Calculer le salaire mensuel d'un coach
  static async calculerSalaireMensuel(coachId, annee, mois) {
    const [coachRows] = await pool.execute('SELECT salary_type, hourly_rate, commission_rate FROM coaches WHERE id = ?', [coachId]);

    if (coachRows.length === 0) {
      throw new Error('Coach non trouvé');
    }

    const coach = coachRows[0];

    const [seanceRows] = await pool.execute(
      `SELECT heureDebut, heureFin, prix 
       FROM seances 
       WHERE coachId = ? AND YEAR(dateSeance) = ? AND MONTH(dateSeance) = ?`,
      [coachId, annee, mois]
    );

    if (coach.salary_type === 'hourly') {
      let totalHeures = 0;
      seanceRows.forEach(seance => {
        const debut = new Date(`1970-01-01T${seance.heureDebut}`);
        const fin = new Date(`1970-01-01T${seance.heureFin}`);
        const diffHeures = (fin - debut) / (1000 * 60 * 60); // Convertir ms → heures
        totalHeures += diffHeures;
      });

      return totalHeures * coach.hourly_rate;
    } else if (coach.salary_type === 'commission') {
      let totalCommission = 0;
      seanceRows.forEach(seance => {
        totalCommission += seance.prix * (coach.commission_rate / 100);
      });

      return totalCommission;
    } else {
      throw new Error('Type de salaire inconnu');
    }
  }

  // Récupérer les séances par mois pour un coach avec salaire mensuel
  static async getSeancesByMonth(coachId, annee) {
    const [coachRows] = await pool.execute('SELECT salary_type, hourly_rate, commission_rate FROM coaches WHERE id = ?', [coachId]);

    if (coachRows.length === 0) {
      throw new Error('Coach non trouvé');
    }

    const [seanceRows] = await pool.execute(
      `SELECT 
         MONTH(dateSeance) AS mois, 
         s.id, s.nom, s.dateSeance, s.heureDebut, s.heureFin, s.prix, s.statut,
         c.nom AS cours_nom, co.nom AS coach_nom, e.nom AS emplacement_nom
       FROM seances s
       JOIN cours c ON s.coursId = c.id
       JOIN coaches co ON s.coachId = co.id
       JOIN emplacements e ON s.emplacementId = e.id
       WHERE s.coachId = ? AND YEAR(dateSeance) = ?
       ORDER BY mois, dateSeance`,
      [coachId, annee]
    );

    // Grouper les séances par mois
    const seancesParMois = {};
    for (let i = 1; i <= 12; i++) {
      seancesParMois[i] = [];
    }

    seanceRows.forEach(seance => {
      seancesParMois[seance.mois].push(seance);
    });

    // Calculer le salaire pour chaque mois
    const result = [];
    for (let mois = 1; mois <= 12; mois++) {
      const salaire = await this.calculerSalaireMensuel(coachId, annee, mois);
      result.push({
        mois,
        seances: seancesParMois[mois],
        salaire: salaire || 0
      });
    }

    return result;
  }

  // Supprimer un coach par ID
  static async delete(id) {
    const query = 'DELETE FROM coaches WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    return result;
  }
}

export default Coach;