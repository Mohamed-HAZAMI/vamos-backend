import express from 'express';
import packController from '../controllers/packController.js';

const router = express.Router();

router.get('/names', packController.getPackNames);
router.get('/', packController.getAllPacks);
router.get('/:id', packController.getPackById);
router.post('/', packController.createPack);
router.put('/:id', packController.updatePack);
router.delete('/:id', packController.deletePack);

export default router;