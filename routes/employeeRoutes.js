import express from 'express';
import {
  getEmployees,
  getEmployee,
  addEmployee,
  modifyEmployee,
  removeEmployee
} from '../controllers/employeeController.js';

const router = express.Router();

router.get('/', getEmployees);
router.get('/:id', getEmployee);
router.post('/', addEmployee);
router.put('/:id', modifyEmployee);
router.delete('/:id', removeEmployee);

export default router;
