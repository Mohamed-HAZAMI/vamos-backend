// jobs/reminderCron.js
import cron from 'node-cron';
import axios from 'axios';
import mysql from 'mysql2';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

class ReminderCron {
  constructor() {
    this.daysBeforeExpiry = 7;
    this.smsConfig = {
      apiUrl: 'http://bulk.smsing.tn/Api/Api.aspx',
      apiKey: 'd8lBcn5MkHITYxFi3VJnQbhV/VPPTy7/-/RFUn1/-/e/-/gIrYpcagSOQskmCnNqmyO5j5uCDg01iBO5V/IDxz/-/MkFEISC4b5zY4kz',
      sender: 'VAMOS SPORT'
    };
    
    // Configuration de la base de données
    this.dbConfig = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
    };
    
    this.pool = mysql.createPool(this.dbConfig);
    this.promisePool = this.pool.promise();
    
    // Initialiser la table au démarrage
    this.initializeSmsLogsTable();
  }

  start() {
    // Exécuter tous les jours à 11:36 AM
    cron.schedule('00 12 * * *', async () => {
      try {
        await this.sendAutomaticExpiryReminders();
      } catch (error) {
        console.error('❌ Erreur dans la tâche cron:', error);
      }
    });

    
    // Test au démarrage
    this.testConnection();
  }

  async initializeSmsLogsTable() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS sms_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          abonnement_id INT NOT NULL,
          reminder_type VARCHAR(50) NOT NULL,
          sent_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (abonnement_id) REFERENCES abnmts(id),
          UNIQUE KEY unique_reminder (abonnement_id, reminder_type)
        )
      `;
      
      await this.promisePool.execute(createTableQuery);
    } catch (error) {
      console.error('❌ Erreur création table sms_logs:', error.message);
    }
  }

  async testConnection() {
    try {
      const [rows] = await this.promisePool.execute('SELECT 1 as test');
    } catch (error) {
      console.error('❌ Erreur de connexion à la base de données:', error.message);
    }
  }

  async sendAutomaticExpiryReminders() {
    try {
      
      // D'abord, vérifier si la table sms_logs existe
      await this.checkSmsLogsTable();
      
      const query = `
        SELECT 
          abn.id as abonnement_id,
          abn.date_fin,
          ad.id as adherent_id,
          ad.nom as adherent_nom,
          ad.prenom as adherent_prenom,
          ad.phone as adherent_phone,
          ad.phone2 as adherent_phone2,
          c.nom as cours_nom,
          DATEDIFF(abn.date_fin, CURDATE()) as jours_restants
        FROM abnmts abn
        LEFT JOIN adherents ad ON abn.adherent_id = ad.id
        LEFT JOIN ecoles c ON abn.cours_id = c.id
        WHERE DATEDIFF(abn.date_fin, CURDATE()) = ?
          AND abn.date_fin = DATE_ADD(CURDATE(), INTERVAL ? DAY)
          AND NOT EXISTS (
            SELECT 1 FROM sms_logs 
            WHERE abonnement_id = abn.id 
            AND reminder_type = 'expiry_7_days'
          )
      `;

      const [abonnements] = await this.promisePool.execute(query, [
        this.daysBeforeExpiry, 
        this.daysBeforeExpiry
      ]);
      

      let successCount = 0;
      let errorCount = 0;

      for (const abonnement of abonnements) {
        try {
          await this.sendReminderForAbonnement(abonnement);
          successCount++;
          
          // Marquer comme envoyé dans la base de données
          await this.markAsSent(abonnement.abonnement_id);
        } catch (error) {
          console.error(`❌ Erreur pour l'abonnement ${abonnement.abonnement_id}:`, error.message);
          errorCount++;
        }
      }
      
      return {
        success: true,
        sent: successCount,
        errors: errorCount,
        total: abonnements.length
      };

    } catch (error) {
      console.error('❌ Erreur générale dans sendAutomaticExpiryReminders:', error);
      throw error;
    }
  }

  async checkSmsLogsTable() {
    try {
      // Vérifier si la table existe
      await this.promisePool.execute('SELECT 1 FROM sms_logs LIMIT 1');
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        await this.initializeSmsLogsTable();
      } else {
        throw error;
      }
    }
  }

  // Méthode pour marquer un SMS comme envoyé
  async markAsSent(abonnementId) {
    try {
      const query = `
        INSERT INTO sms_logs (abonnement_id, reminder_type, sent_date) 
        VALUES (?, 'expiry_7_days', CURDATE())
      `;
      
      await this.promisePool.execute(query, [abonnementId]);
    } catch (error) {
      console.error('❌ Erreur lors du marquage du SMS:', error.message);
    }
  }

  async sendReminderForAbonnement(abonnement) {
    const { adherent_nom, adherent_prenom, date_fin, jours_restants, adherent_phone, adherent_phone2 } = abonnement;
    
    const nomComplet = `${adherent_nom} ${adherent_prenom}`;
    const message = this.generateExpiryMessage(nomComplet, date_fin, jours_restants);
    
    const phoneNumbers = [];
    
    if (adherent_phone && adherent_phone.trim() !== '') {
      phoneNumbers.push(adherent_phone);
    }
    
    if (adherent_phone2 && adherent_phone2.trim() !== '') {
      phoneNumbers.push(adherent_phone2);
    }
    
    if (phoneNumbers.length === 0) {
      throw new Error('Aucun numéro de téléphone valide trouvé');
    }

    
    const results = await this.sendSMS(phoneNumbers, message);
    
    const success = results.some(result => result.success);
    
    if (!success) {
      throw new Error(`Échec de l'envoi des SMS`);
    }
    
    return results;
  }

  async sendSMS(phoneNumbers, message) {
    try {
      const numbers = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];
      const results = [];
      
      for (const phone of numbers) {
        if (!phone || phone.trim() === '') continue;
        
        const formattedPhone = this.formatPhoneNumber(phone);
        if (!formattedPhone) continue;

        const params = {
          fct: 'sms',
          key: this.smsConfig.apiKey,
          mobile: formattedPhone,
          sms: message,
          sender: this.smsConfig.sender
        };

        
        try {
          // ENVOI RÉEL DU SMS
          const response = await axios.get(this.smsConfig.apiUrl, { 
            params, 
            timeout: 30000
          });
          
          
          const isSuccess = response.data.includes('OK') || 
                           response.data.includes('Success') || 
                           response.data.includes('200') ||
                           !response.data.includes('Error');
          
          results.push({
            phone: formattedPhone,
            success: isSuccess,
            response: response.data
          });

          if (isSuccess) {
            console.log(`✅ SMS envoyé avec succès à ${formattedPhone}`);
          } else {
            console.log(`❌ Échec d'envoi SMS à ${formattedPhone}: ${response.data}`);
          }
          
        } catch (apiError) {
          console.error(`❌ Erreur API SMS pour ${formattedPhone}:`, apiError.message);
          results.push({
            phone: formattedPhone,
            success: false,
            response: apiError.message
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      return results;
    } catch (error) {
      console.error('Erreur générale lors de l\'envoi des SMS:', error);
      throw error;
    }
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.toString().replace(/\D/g, '');
    
    if (cleaned.startsWith('216')) {
      return cleaned;
    }
    
    if (cleaned.length === 8) {
      return `216${cleaned}`;
    }
    
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return `216${cleaned.substring(1)}`;
    }
    
    return null;
  }

  generateExpiryMessage(adherentNom, dateFin, joursRestants) {
    return `Cher ${adherentNom}, votre abonnement VAMOS SPORT expire dans ${joursRestants} jour(s) (le ${this.formatDate(dateFin)}). Renouvelez-le pour continuer à profiter de nos activités.`;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }
}

export default new ReminderCron();