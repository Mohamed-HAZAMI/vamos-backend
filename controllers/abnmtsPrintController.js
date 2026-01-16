import Abonnement from '../models/abnmtsModel.js';

// Récupérer tous les abonnements
export const getAbnmtsPrint = async (req, res) => {
    const { id } = req.params;
    try {
        const abonnements = await Abonnement.getAdherentsWithPacks(id);
        
        // Parser le champ details_versements en tableau d'objets
        const abonnementsAvecVersements = abonnements.map(abonnement => {
            if (abonnement.details_versements) {
                try {
                    abonnement.details_versements = JSON.parse(abonnement.details_versements);
                } catch (error) {
                    // En cas d'erreur de parsing, on garde la valeur originale
                    console.error('Erreur parsing details_versements:', error);
                    abonnement.details_versements = [];
                }
            } else {
                abonnement.details_versements = [];
            }
            return abonnement;
        });

        res.json({
            success: true,
            data: abonnementsAvecVersements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};