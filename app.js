import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
dotenv.config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development'
});

// Import routes
import adherentRoutes from './routes/adherentRoutes.js';
import reservationsRoutes from './routes/reservationsRoutes.js';
import coursRoutes from './routes/coursRoutes.js';
import emplacementRoutes from './routes/emplacementRoutes.js';
import prospectRoutes from './routes/prospectRoutes.js';
import actionRoutes from './routes/actionRoutes.js';
import seanceRoutes from './routes/seanceRoutes.js';
import abonnementRoutes from './routes/abonnementRoutes.js';
import coachRoutes from './routes/coachRoutes.js';
import factureRoutes from './routes/factureRoutes.js';
import EmployeeRoutes from './routes/employeeRoutes.js';
import packRoutes from './routes/packRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import ecoleRoutes from './routes/ecoleRoutes.js'
import groupsRoutes from './routes/groupsRoutes.js'
import abnmtsRoutes from './routes/abnmtsRoutes.js'
import pack_Routes from './routes/pack_Routes.js'
import depensesRoutes from './routes/depensesRoutes.js'
import abnmtsPrintRoutes from './routes/abnmtsPrintRoutes.js'
import paiementRoutes from './routes/paiementRoutes.js'
import presenceRoutes from './routes/presenceRoutes.js'
import journalRoutes from './routes/journalRoutes.js'
import smsRoutes from './routes/smsRoutes.js';
import versementsRoutes from './routes/versementsRoutes.js';
import presenceCoachRoutes from "./routes/presenceCoachRoutes.js"
import suivieRoutes from "./routes/suivieRoute.js"
import recettesRoutes from "./routes/recettesRoutes.js"
import performencesRoutes from "./routes/performencesRoutes.js"
import sessionRoutes from "./routes/sessionRoutes.js"

const app = express();

// Middleware - AUGMENTER LA LIMITE POUR LES IMAGES
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Augmenté à 50MB pour les images base64
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files for invoices
app.use('/invoices', express.static(path.join(process.cwd(), process.env.INVOICES_PATH)));

// Routes
app.use('/api/adherents', adherentRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/reservation', reservationRoutes);
app.use('/api/ecole', ecoleRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/cours', coursRoutes);
app.use('/api/emplacements', emplacementRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/seances', seanceRoutes);
app.use('/api/abonnements', abonnementRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/factures', factureRoutes);
app.use('/api/employees', EmployeeRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/users', userRoutes);
app.use('/api/abnmts', abnmtsRoutes);
app.use('/api/abnmtsPrint', abnmtsPrintRoutes);
app.use('/api/pack_categories', pack_Routes);
app.use('/api/depenses', depensesRoutes);
app.use('/api/paiements', paiementRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/versements', versementsRoutes);
app.use('/api/presenceCoach', presenceCoachRoutes);
app.use('/api/suivie', suivieRoutes);
app.use('/api/recettes', recettesRoutes);
app.use('/api/performences', performencesRoutes);
app.use('/api/session', sessionRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// MySQL Connection using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  charset: 'utf8mb4' // Important pour supporter les caractères spéciaux et les images
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Erreur de connexion à MySQL:', err.stack);
    process.exit(1);
  }
  connection.release();
});


// Error handling
app.use((err, req, res, next) => {
  console.error('Erreur détectée:', err);
  
  // Gestion spécifique des erreurs de taille de payload
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      message: 'Payload trop large',
      error: 'L\'image est trop volumineuse. Veuillez utiliser une image plus petite.',
      maxSize: '50MB'
    });
  }
  
  res.status(500).json({
    message: 'Une erreur est survenue',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route non trouvée',
    path: req.originalUrl
  });
});

export default app;