// backend/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development'
});

// Configuration de la connexion MySQL avec le pool de connexions Promises
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm',
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
    queueLimit: 0,
    
    // Optional SSL configuration for production
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA
    } : undefined
});

// Test the database connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
})();

// Exporter le pool pour une utilisation dans d'autres fichiers
export default pool;