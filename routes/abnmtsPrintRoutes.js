import express from 'express';
import {
   getAbnmtsPrint
} from '../controllers/abnmtsPrintController.js';

const router = express.Router();

// Routes CRUD de base
router.get('/:id', getAbnmtsPrint);


export default router;