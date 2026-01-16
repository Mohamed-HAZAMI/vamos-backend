import Presence from '../models/presenceModel.js';

export const getAllPresenceByAdherentId = async (req, res) => {
    try {
        const { idAdherent } = req.params;
        
        // Validate adherent ID
        if (!idAdherent || isNaN(idAdherent)) {
            return res.status(400).json({ message: 'Invalid adherent ID' });
        }

        const presences = await Presence.getAllPresenceByAdherentId(idAdherent);
        
        if (presences.length === 0) {
            return res.status(404).json({ 
                message: 'No presence records found for this adherent',
                data: []
            });
        }

        res.status(200).json({
            message: 'Presence records retrieved successfully',
            data: presences
        });
    } catch (error) {
        console.error('Error in getAllPresenceByAdherentId:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

// Optional: Get presence statistics
export const getPresenceStats = async (req, res) => {
    try {
        const { idAdherent } = req.params;
        
        if (!idAdherent || isNaN(idAdherent)) {
            return res.status(400).json({ message: 'Invalid adherent ID' });
        }

        const stats = await Presence.getPresenceStatsByAdherentId(idAdherent);
        
        res.status(200).json({
            message: 'Presence statistics retrieved successfully',
            data: stats
        });
    } catch (error) {
        console.error('Error in getPresenceStats:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

// Remove the default export at the bottom