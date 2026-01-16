import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development'
});

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
});

export async function create(userData) {
  const { email, password, role } = userData;
  const query = 'INSERT INTO users (email, password, role) VALUES (?, ?, ?)';
  const [result] = await pool.execute(query, [email, password, role]);
  return result;
}

export async function findOne(options) {
  const { where } = options;
  const query = 'SELECT * FROM users WHERE email = ? LIMIT 1';
  const [rows] = await pool.execute(query, [where.email]);
  return rows[0] || null;
}

export async function findById(id) {
  const query = 'SELECT * FROM users WHERE id = ? LIMIT 1';
  const [rows] = await pool.execute(query, [id]);
  return rows[0] || null;
}

export async function update(id, userData) {
  const { email, password, role } = userData;
  const query = 'UPDATE users SET email = ?, password = ?, role = ? WHERE id = ?';
  const [result] = await pool.execute(query, [email, password, role, id]);
  return result.affectedRows > 0;
}

export async function remove(id) {
  const query = 'DELETE FROM users WHERE id = ?';
  const [result] = await pool.execute(query, [id]);
  return result.affectedRows > 0;
}

export async function findAll() {
  const query = 'SELECT * FROM users';
  const [rows] = await pool.execute(query);
  return rows;
}