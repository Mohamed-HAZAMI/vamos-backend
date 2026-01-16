import pool from '../config/db.js';

// Récupérer tous les employés
export const getAllEmployees = async () => {
  const [rows] = await pool.query('SELECT * FROM employees');
  return rows;
};

// Récupérer un employé par ID
export const getEmployeeById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
  return rows[0];
};

// Créer un nouvel employé
export const createEmployee = async (employee) => {
  const { first_name, last_name, email, password, role, hire_date, phone } = employee;
  // const [result] = await pool.query(
  //   `INSERT INTO employees 
  //     (first_name, last_name, email, password, role, hire_date, phone) 
  //    VALUES (?, ?, ?, ?, ?, ?, ?)`,
  //   [first_name, last_name, email, password, role, hire_date, phone]
  // );
  // return result.insertId;
};

// Mettre à jour un employé
export const updateEmployee = async (id, employee) => {
  const { first_name, last_name, email, password, role, hire_date, phone } = employee;
  const [result] = await pool.query(
    `UPDATE employees SET 
      first_name = ?, 
      last_name = ?, 
      email = ?, 
      password = ?, 
      role = ?, 
      hire_date = ?, 
      phone = ?
     WHERE id = ?`,
    [first_name, last_name, email, password, role, hire_date, phone, id]
  );
  return result;
};

// Supprimer un employé
export const deleteEmployee = async (id) => {
  const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [id]);
  return result;
};