import app from './app.js';
import dotenv from 'dotenv';
import reminderCron from './jobs/reminderCron.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
  
  // Démarrer le système de rappels SMS
  reminderCron.start();
});