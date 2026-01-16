import express from 'express';
import { getActions } from '../controllers/actionController.js';

const router = express.Router();

router.get('/', getActions);

export default router;
