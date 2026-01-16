import Paiement from '../models/paiementModel.js';

const getAllPaiement = async (req, res) => {
    try {
        const { idAdherent } = req.params;
        const paiements = await Paiement.getAllPaiementByAdherentId(idAdherent);
        res.status(200).json(paiements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addPaiement = async (req, res) => {
    try {
        const { abonnementId, montant, typePaiement, banque, numeroCompte, details } = req.body;
        
        // Validation des données requises
        if (!abonnementId || !montant || !typePaiement) {
            return res.status(400).json({ 
                message: 'Données manquantes: abonnementId, montant et typePaiement sont requis' 
            });
        }

        // Vérifier si le montant est valide
        if (montant <= 0) {
            return res.status(400).json({ 
                message: 'Le montant doit être supérieur à 0' 
            });
        }

        // Appeler le modèle pour ajouter le paiement
        const result = await Paiement.addPaiement({
            abonnementId,
            montant,
            typePaiement,
            banque,
            numeroCompte,
            details
        });

        res.status(201).json({ 
            message: 'Paiement ajouté avec succès',
            paiement: result 
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout du paiement:', error);
        if (error.message.includes('supérieur')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Erreur serveur lors de l\'ajout du paiement' });
    }
};

export {
    getAllPaiement,
    addPaiement
};