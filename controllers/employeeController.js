import {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
  } from '../models/employeeModel.js';
  
  export const getEmployees = async (req, res) => {
    const employees = await getAllEmployees();
    res.json(employees);
  };
  
  export const getEmployee = async (req, res) => {
    const employee = await getEmployeeById(req.params.id);
    employee ? res.json(employee) : res.status(404).json({ message: 'Employé non trouvé' });
  };
  
  export const addEmployee = async (req, res) => {
    const id = await createEmployee(req.body);
    res.status(201).json({ id, ...req.body });
  };
  
  export const modifyEmployee = async (req, res) => {
    await updateEmployee(req.params.id, req.body);
    res.json({ message: 'Employé mis à jour' });
  };
  
  export const removeEmployee = async (req, res) => {
    await deleteEmployee(req.params.id);
    res.json({ message: 'Employé supprimé' });
  };
  