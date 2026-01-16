import pool from '../config/db.js';

export default class Group {
  static async create(nom, description, ecole_id) {
    const [result] = await pool.execute(
      'INSERT INTO `groups` (nom, description, ecole_id) VALUES (?, ?, ?)',
      [nom, description, ecole_id]
    );
    return result.insertId;
  }

  static async findAll() {
    const [rows] = await pool.query('SELECT * FROM `groups`');
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM `groups` WHERE id = ?', [id]);
    return rows[0]
  }

  static async update(id, nom, description) {
    await pool.execute(
      'UPDATE `groups` SET nom = ?, description = ? WHERE id = ?',
      [nom, description, id]
    );
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////

  static async delete(id) {
    // D'abord récupérer tous les emplacements liés à ce groupe
    const [emplacements] = await pool.execute(
      'SELECT emplacement_id FROM group_emplacement WHERE group_id = ?',
      [id]
    );
  
    // Pour chaque emplacement, supprimer les réservations et leurs relations
    for (const { emplacement_id } of emplacements) {
      // 1. Supprimer les relations reservation_aderent pour cet emplacement
      await pool.execute(
        'DELETE ra FROM reservation_aderent ra ' +
        'JOIN reservation r ON ra.reservation_id = r.id ' +
        'WHERE r.idEmplacement = ?',
        [emplacement_id]
      );
  
      // 2. Supprimer les réservations pour cet emplacement
      await pool.execute(
        'DELETE FROM reservation WHERE idEmplacement = ?',
        [emplacement_id]
      );
    }
  
    // 3. Supprimer les relations group_emplacement
    await pool.execute('DELETE FROM group_emplacement WHERE group_id = ?', [id]);
    
    // 4. Supprimer les autres relations du groupe (coachs, adherents)
    await pool.execute('DELETE FROM group_coach WHERE group_id = ?', [id]);
    await pool.execute('DELETE FROM group_adherent WHERE group_id = ?', [id]);
    
    // 5. Finalement supprimer le groupe lui-même (avec backticks)
    await pool.execute('DELETE FROM `groups` WHERE id = ?', [id]);
  }
  

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Méthodes pour gérer les relations avec les coaches
  static async getGroupCoaches(groupId) {
    const [rows] = await pool.execute(
      `SELECT c.* FROM coaches c 
       JOIN group_coach gc ON c.id = gc.coach_id 
       WHERE gc.group_id = ?`,
      [groupId]
    );
    return rows;
  }

  static async updateGroupCoaches(groupId, coachIds) {
    // Commencer une transaction
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // Supprimer les relations existantes
      await conn.execute('DELETE FROM group_coach WHERE group_id = ?', [groupId]);

      // Ajouter les nouvelles relations
      for (const coachId of coachIds) {
        await conn.execute(
          'INSERT INTO group_coach (group_id, coach_id) VALUES (?, ?)',
          [groupId, coachId]
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }


  // Adhérents
  static async getGroupAdherents(groupId) {
    const [rows] = await pool.execute(
      `SELECT DISTINCT a.* FROM adherents a
       JOIN group_adherent ga ON a.id = ga.adherent_id
       WHERE ga.group_id = ?`,
      [groupId]
    );
    return rows;
  }

  static async updateGroupAdherents(groupId, adherentIds) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      await conn.execute('DELETE FROM group_adherent WHERE group_id = ?', [groupId]);
      
      for (const adherentId of adherentIds) {
        await conn.execute(
          'INSERT INTO group_adherent (group_id, adherent_id) VALUES (?, ?)',
          [groupId, adherentId]
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // Emplacements
  static async getGroupEmplacements(groupId) {
    const [rows] = await pool.execute(
      `SELECT e.* FROM emplacements e
       JOIN group_emplacement ge ON e.id = ge.emplacement_id
       WHERE ge.group_id = ?`,
      [groupId]
    );
    return rows;
  }

  static async updateGroupEmplacements(groupId, emplacementIds) {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      await conn.execute('DELETE FROM group_emplacement WHERE group_id = ?', [groupId]);
      
      for (const emplacementId of emplacementIds) {
        await conn.execute(
          'INSERT INTO group_emplacement (group_id, emplacement_id) VALUES (?, ?)',
          [groupId, emplacementId]
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}