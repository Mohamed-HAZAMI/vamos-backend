// jobs/sendSms.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class SMSService {
  constructor() {
    this.smsConfig = {
      apiUrl: 'http://bulk.smsing.tn/Api/Api.aspx',
      apiKey: 'd8lBcn5MkHITYxFi3VJnQbhV/VPPTy7/-/RFUn1/-/e/-/gIrYpcagSOQskmCnNqmyO5j5uCDg01iBO5V/IDxz/-/MkFEISC4b5zY4kz',
      sender: 'VAMOS SPORT'
    };
  }

  /**
   * Envoie un SMS à un ou plusieurs numéros
   */
  async sendSMS(phoneNumbers, message) {
    try {
      // const numbers = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];
      // const results = [];
      
      // for (const phone of numbers) {
      //   if (!phone || phone.trim() === '') continue;
        
      //   const formattedPhone = this.formatPhoneNumber(phone);
      //   if (!formattedPhone) continue;

      //   const params = {
      //     fct: 'sms',
      //     key: this.smsConfig.apiKey,
      //     mobile: formattedPhone,
      //     sms: message,
      //     sender: this.smsConfig.sender
      //   };

      //   console.log(`📤 Envoi SMS à ${formattedPhone}`);
        
      //   try {
      //     const response = await axios.get(this.smsConfig.apiUrl, { 
      //       params, 
      //       timeout: 30000 
      //     });
          
      //     console.log(`📨 Réponse API SMS: ${response.data}`);
          
      //     const isSuccess = response.data.includes('OK') || 
      //                      response.data.includes('Success') || 
      //                      response.data.includes('200') ||
      //                      !response.data.includes('Error');
          
      //     results.push({
      //       phone: formattedPhone,
      //       success: isSuccess,
      //       response: response.data
      //     });

      //     if (isSuccess) {
      //       console.log(`✅ SMS envoyé avec succès à ${formattedPhone}`);
      //     } else {
      //       console.log(`❌ Échec d'envoi SMS à ${formattedPhone}: ${response.data}`);
      //     }
          
      //   } catch (apiError) {
      //     console.error(`❌ Erreur API SMS pour ${formattedPhone}:`, apiError.message);
      //     results.push({
      //       phone: formattedPhone,
      //       success: false,
      //       response: apiError.message
      //     });
      //   }
        
      //   // Pause de 2 secondes entre les envois
      //   await new Promise(resolve => setTimeout(resolve, 2000));
      // }
      
      return "results";
    } catch (error) {
      console.error('Erreur générale lors de l\'envoi des SMS:', error);
      throw error;
    }
  }

  /**
   * Formate un numéro de téléphone
   */
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

  /**
   * Génère un message de confirmation d'abonnement
   */
  generateSubscriptionMessage(adherentNom, dateDebut, dateFin, prixTtc) {
    const formattedDateDebut = new Date(dateDebut).toLocaleDateString('fr-FR');
    const formattedDateFin = new Date(dateFin).toLocaleDateString('fr-FR');
    
    return `Bonjour ${adherentNom}, votre abonnement a été créé avec succès. Période: ${formattedDateDebut} au ${formattedDateFin}. Montant: ${prixTtc} DT. Merci de votre confiance! - VAMOS SPORT`;
  }

  /**
   * Génère un message de rappel d'expiration
   */
  generateExpiryReminderMessage(adherentNom, dateFin, joursRestants) {
    const formattedDateFin = new Date(dateFin).toLocaleDateString('fr-FR');
    
    return `Cher ${adherentNom}, votre abonnement VAMOS SPORT expire dans ${joursRestants} jour(s) (le ${formattedDateFin}). Renouvelez-le pour continuer à profiter de nos activités.`;
  }

  /**
   * Envoie des SMS de confirmation d'abonnement
   */
  async sendSubscriptionConfirmation(adherentsData, abonnementDetails) {
    try {
      console.log('📱 Début de l\'envoi des SMS de confirmation d\'abonnement');
      
      const results = [];
      const { date_debut, date_fin, prix_ttc } = abonnementDetails;

      for (const adherent of adherentsData) {
        const { nom, prenom, phone, phone2 } = adherent;
        
        const message = this.generateSubscriptionMessage(
          `${prenom} ${nom}`,
          date_debut,
          date_fin,
          prix_ttc
        );

        const phoneNumbers = [];
        if (phone && phone.trim() !== '') phoneNumbers.push(phone);
        if (phone2 && phone2.trim() !== '') phoneNumbers.push(phone2);

        if (phoneNumbers.length === 0) {
          results.push({
            adherent: `${prenom} ${nom}`,
            success: false,
            error: 'Aucun numéro de téléphone valide'
          });
          continue;
        }

        const smsResults = await this.sendSMS(phoneNumbers, message);
        
        smsResults.forEach(result => {
          results.push({
            adherent: `${prenom} ${nom}`,
            phone: result.phone,
            success: result.success,
            response: result.response
          });
        });
      }

      const successfulSMS = results.filter(result => result.success);
      const failedSMS = results.filter(result => !result.success);


      return {
        success: true,
        total: results.length,
        successful: successfulSMS.length,
        failed: failedSMS.length,
        results: results
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi des SMS de confirmation:', error);
      throw error;
    }
  }

  /**
   * Teste l'envoi d'un SMS
   */
  async testSMS(phoneNumber, message = "Test SMS from VAMOS SPORT") {
    try {
      const results = await this.sendSMS([phoneNumber], message);
      return {
        success: true,
        results: results
      };
    } catch (error) {
      console.error('❌ Erreur lors du test SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Exporte une instance unique du service
const smsService = new SMSService();
export default smsService;