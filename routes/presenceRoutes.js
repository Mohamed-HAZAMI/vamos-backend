import express from 'express';
import {getAllPresenceByAdherentId , getPresenceStats} from '../controllers/presenceController.js';

const router = express.Router();

router.get('/adherent/:idAdherent', getAllPresenceByAdherentId);
router.get('/adherent/:idAdherent/stats', getPresenceStats);

export default router;