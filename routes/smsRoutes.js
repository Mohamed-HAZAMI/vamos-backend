// routes/smsRoutes.js
import express from 'express';
import smsService from '../jobs/sendSms.js';

const router = express.Router();

/**
 * Route pour envoyer des SMS de confirmation d'abonnement
 */
router.post('/send-subscription-sms', async (req, res) => {
  try {
    const { adherents, abonnementDetails } = req.body;

    if (!adherents || !Array.isArray(adherents) || !abonnementDetails) {
      return res.status(400).json({
        success: false,
        message: 'Données requises: adherents (array) et abonnementDetails'
      });
    }

    const result = await smsService.sendSubscriptionConfirmation(adherents, abonnementDetails);
    
    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Erreur dans send-subscription-sms:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi des SMS',
      error: error.message
    });
  }
});

/**
 * Route pour tester l'envoi de SMS
 */
router.post('/test-sms', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de téléphone est requis'
      });
    }

    const result = await smsService.testSMS(phoneNumber, message);
    
    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Erreur dans test-sms:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test SMS',
      error: error.message
    });
  }
});

/**
 * Route pour envoyer un SMS personnalisé
 */
router.post('/send-custom-sms', async (req, res) => {
  try {
    const { phoneNumbers, message } = req.body;

    if (!phoneNumbers || !message) {
      return res.status(400).json({
        success: false,
        message: 'Les numéros de téléphone et le message sont requis'
      });
    }

    const results = await smsService.sendSMS(phoneNumbers, message);
    
    res.status(200).json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('❌ Erreur dans send-custom-sms:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du SMS personnalisé',
      error: error.message
    });
  }
});

export default router;