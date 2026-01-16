import Adherent from '../models/adherentModel.js';


// Créer un nouvel adhérent
const createAdherent = async (req, res) => {
    try {
        const { 
            nom, 
            prenom, 
            email, 
            cours_id, 
            groupe_id, 
            password, 
            role, 
            phone, 
            phone2, 
            assurance, 
            date_validite_assurance,
            image,
            date_naissance,
            // Nouveaux champs de paiement d'assurance
            type_paiement_assurance,
            banque,
            numero_compte,
            details_paiement
        } = req.body;

        // Vérifier l'email seulement s'il est fourni et non vide
        if (email && email.trim() !== '') {
            const allAdherents = await Adherent.getAll();
            const existingAdherent = allAdherents.find(a => a.email === email);
            if (existingAdherent) {
                return res.status(400).json({ message: 'Cet email est déjà utilisé' });
            }
        }

        const newAdherentId = await Adherent.create(
            nom, 
            prenom, 
            email,
            cours_id, 
            groupe_id, 
            password, 
            role, 
            phone,
            phone2,
            assurance, 
            date_validite_assurance,
            image,
            date_naissance,
            // Nouveaux paramètres
            type_paiement_assurance,
            banque,
            numero_compte,
            details_paiement
        );
        
        // Retourner les informations complètes de l'adhérent créé
        res.status(201).json({ 
            message: 'Adhérent créé avec succès', 
            id: newAdherentId,
            nom: nom,
            prenom: prenom,
            phone: phone,
            email: email,
            date_naissance: date_naissance,
            type_paiement_assurance: type_paiement_assurance
        });
    } catch (error) {
        console.error('Erreur dans createAdherent:', error);
        res.status(500).json({ message: error.message });
    }
};

// Mettre à jour un adhérent
const updateAdherent = async (req, res) => {
    try {
        const { 
            nom, 
            prenom, 
            email, 
            cour_id, 
            groupe_id, 
            role, 
            phone, 
            phone2, 
            assurance, 
            date_validite_assurance,
            image,
            date_naissance,
            // Nouveaux champs de paiement d'assurance
            type_paiement_assurance,
            banque,
            numero_compte,
            details_paiement,
            password // peut être undefined, null ou vide
        } = req.body;

        // Vérifier l'email seulement s'il est fourni et non vide
        if (email && email.trim() !== '') {
            const allAdherents = await Adherent.getAll();
            const existingAdherent = allAdherents.find(a => a.email === email && a.id !== parseInt(req.params.id));
            if (existingAdherent) {
                return res.status(400).json({ message: 'Cet email est déjà utilisé par un autre adhérent' });
            }
        }

        // Récupérer l'adhérent actuel pour vérifier son mot de passe
        const currentAdherent = await Adherent.getById(req.params.id);
        let finalPassword = password;
        
        // Si le mot de passe n'est pas fourni ou est vide, garder l'ancien
        if (password === undefined || password === null || password === '') {
            // Garder le mot de passe actuel de l'adhérent
            finalPassword = currentAdherent ? currentAdherent.password : null;
        }

        const affectedRows = await Adherent.update(
            req.params.id, 
            nom, 
            prenom, 
            email,
            cour_id, 
            groupe_id, 
            role, 
            phone,
            phone2,
            assurance, 
            date_validite_assurance,
            image,
            date_naissance,
            // Nouveaux paramètres
            type_paiement_assurance,
            banque,
            numero_compte,
            details_paiement,
            finalPassword // Passer le mot de passe final (nouveau ou ancien)
        );
        
        if (affectedRows === 0) return res.status(404).json({ message: 'Adhérent non trouvé' });
        
        // Récupérer l'adhérent mis à jour pour le retourner
        const updatedAdherent = await Adherent.getById(req.params.id);
        
        res.status(200).json(updatedAdherent);
    } catch (error) {
        console.error('Erreur dans updateAdherent:', error);
        res.status(500).json({ message: error.message });
    }
};

// Mettre à jour uniquement l'image
const updateAdherentImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { image } = req.body;


        if (!image) {
            return res.status(400).json({ message: 'Image data is required' });
        }

        const affectedRows = await Adherent.updateImage(id, image);
        
        if (affectedRows === 0) return res.status(404).json({ message: 'Adhérent non trouvé' });
        
        // Récupérer l'adhérent mis à jour
        const updatedAdherent = await Adherent.getById(id);
        res.status(200).json(updatedAdherent);
    } catch (error) {
        console.error('Erreur dans updateAdherentImage:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les adhérents par groupe et cours
// const getAdherentByEcoleBycour = async (req, res) => {
//     try {
//         const { idGroupe, idCour } = req.params;   
    
        
//         if (!idGroupe || isNaN(idGroupe)) {
//             return res.status(400).json({ message: "ID de groupe invalide" });
//         }
//         if (!idCour || isNaN(idCour)) {
//             return res.status(400).json({ message: "ID de cours invalide" });
//         }

//         const adherents = await Adherent.getByGroupAndCourse(idGroupe, idCour);
        

        
//         res.status(200).json(adherents);
//     } catch (error) {
//         console.error('Erreur dans getAdherentByEcoleBycour:', error);
//         res.status(500).json({ message: error.message });
//     }
// };

// Récupérer tous les adhérents
const getAllAdherents = async (req, res) => {
    try {
        const adherents = await Adherent.getAll();
        
        res.status(200).json(adherents);
    } catch (error) {
        console.error('Erreur dans getAllAdherents:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer tous les noms et prénoms des adhérents avec leurs IDs
const getAllAdherentNames = async (req, res) => {
    try {
        
        const names = await Adherent.getAllNames();
        
        
        res.status(200).json(names);
    } catch (error) {
        console.error('Erreur dans getAllAdherentNames:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la récupération des noms des adhérents', 
            error: error.message 
        });
    }
};

// Récupérer un adhérent par ID
const getAdherentById = async (req, res) => {
    try {
        const adherentId = req.params.id;
        
        const adherent = await Adherent.getById(adherentId);
        
        if (!adherent) {
            return res.status(404).json({ message: 'Adhérent non trouvé' });
        }
        
        
        res.status(200).json(adherent);
    } catch (error) {
        console.error('Erreur dans getAdherentById:', error);
        res.status(500).json({ message: error.message });
    }
};

// Récupérer les adhérents par groupe et date
const getAdherentByGroupeBydate = async (req, res) => {
    try {
        const { idGroupe, jour, idCour } = req.params;
        
        
        if (!idGroupe || isNaN(idGroupe)) {
            return res.status(400).json({ message: "ID de groupe invalide" });
        }
        
        if (!jour || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) {
            return res.status(400).json({ message: "Format de date invalide (YYYY-MM-DD attendu)" });
        }

        const adherents = await Adherent.getByGroupAndDate(parseInt(idGroupe), jour);
        
        
        res.status(200).json(adherents);
        
    } catch (error) {
        console.error('Erreur dans getAdherentByGroupeBydate:', error);
        res.status(500).json({ 
            message: "Erreur serveur lors de la récupération des adhérents",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Supprimer un adhérent
const deleteAdherent = async (req, res) => {
    try {
        const adherentId = req.params.id;
        
        
        const deletedAdherent = await Adherent.delete(adherentId);
        
        if (!deletedAdherent) {
            return res.status(404).json({ message: 'Adhérent non trouvé' });
        }
        
        
        res.status(200).json({ message: 'Adhérent supprimé avec succès' });
    } catch (error) {
        console.error('Erreur dans deleteAdherent:', error);
        res.status(500).json({ message: error.message });
    }
};

// Statistiques des adhérents par rôle
const getAdherentStats = async (req, res) => {
    try {
        
        const allAdherents = await Adherent.getAll();
        const totalAdherents = allAdherents.length;
        const adminCount = allAdherents.filter(a => a.role === 'admin').length;
        const coachCount = allAdherents.filter(a => a.role === 'coach').length;
        const participantCount = allAdherents.filter(a => a.role === 'participant').length;

        const stats = {
            totalAdherents,
            adminCount,
            coachCount,
            participantCount
        };
        
        
        res.status(200).json(stats);
    } catch (error) {
        console.error('Erreur dans getAdherentStats:', error);
        res.status(500).json({ message: error.message });
    }
};

// Nombre total d'adhérents
const getTotalAdherents = async (req, res) => {
    try {
        
        const total = await Adherent.countAll();
        
        
        res.status(200).json({ totalAdherents: total });
    } catch (error) {
        console.error('Erreur dans getTotalAdherents:', error);
        res.status(500).json({ message: error.message });
    }
};

// NOUVEAU: Archiver un adhérent
const archiveAdherent = async (req, res) => {
    try {
        const { id } = req.params;
        
        
        const affectedRows = await Adherent.archive(id);
        
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Adhérent non trouvé' });
        }
        
        
        res.status(200).json({ 
            message: 'Adhérent archivé avec succès',
            id: parseInt(id),
            archiver: 1
        });
    } catch (error) {
        console.error('Erreur dans archiveAdherent:', error);
        res.status(500).json({ message: error.message });
    }
};

// NOUVEAU: Désarchiver un adhérent
const unarchiveAdherent = async (req, res) => {
    try {
        const { id } = req.params;
        
        
        const affectedRows = await Adherent.unarchive(id);
        
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Adhérent non trouvé' });
        }
        
        
        res.status(200).json({ 
            message: 'Adhérent désarchivé avec succès',
            id: parseInt(id),
            archiver: 0
        });
    } catch (error) {
        console.error('Erreur dans unarchiveAdherent:', error);
        res.status(500).json({ message: error.message });
    }
};

// MODIFIER: getAdherentByEcoleBycour pour inclure le filtre d'archivage
const getAdherentByEcoleBycour = async (req, res) => {
    try {
        const { idGroupe, idCour } = req.params;   
        const { archived = '0' } = req.query; // NOUVEAU: paramètre de filtre
    
        if (!idGroupe || isNaN(idGroupe)) {
            return res.status(400).json({ message: "ID de groupe invalide" });
        }
        if (!idCour || isNaN(idCour)) {
            return res.status(400).json({ message: "ID de cours invalide" });
        }

        const adherents = await Adherent.getByGroupAndCourse(idGroupe, idCour);
        
        // NOUVEAU: Filtrer selon le paramètre archived
        let filteredAdherents = adherents;
        if (archived === '0') {
            filteredAdherents = adherents.filter(adherent => !adherent.archiver || adherent.archiver === 0);
        } else if (archived === '1') {
            filteredAdherents = adherents.filter(adherent => adherent.archiver === 1);
        }
        // Si archived n'est pas spécifié ou = 'all', on prend tous les adhérents

        res.status(200).json(filteredAdherents);
    } catch (error) {
        console.error('Erreur dans getAdherentByEcoleBycour:', error);
        res.status(500).json({ message: error.message });
    }
};

// Fonction utilitaire pour valider et traiter l'image
const processImage = (imageData) => {
    if (!imageData) {
        return null;
    }

    // Si l'image est déjà en base64, la retourner telle quelle
    if (imageData.startsWith('data:image')) {
        return imageData;
    }

    // Si ce n'est pas du base64, on pourrait ajouter d'autres traitements ici
    return imageData;
};

// Contrôleur pour mettre à jour image1
export const updateImage1 = async (req, res) => {
    try {
        const { id } = req.params;
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'Les données de l\'image sont requises'
            });
        }


        // Traiter l'image
        const processedImage = processImage(image);

        // Mettre à jour dans la base de données
        const affectedRows = await Adherent.updateImageField(id, 'image1', processedImage);

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Adhérent non trouvé ou aucune modification effectuée'
            });
        }

        // Récupérer les données mises à jour
        const updatedAdherent = await Adherent.getByIdWithAllImages(id);

        res.status(200).json({
            success: true,
            message: 'Image 1 mise à jour avec succès',
            data: {
                id: updatedAdherent.id,
                nom: updatedAdherent.nom,
                prenom: updatedAdherent.prenom,
                image1: updatedAdherent.image1
            }
        });

    } catch (error) {
        console.error('Erreur dans updateImage1:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la mise à jour de l\'image 1',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Contrôleur pour mettre à jour image2
export const updateImage2 = async (req, res) => {
    try {
        const { id } = req.params;
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'Les données de l\'image sont requises'
            });
        }


        // Traiter l'image
        const processedImage = processImage(image);

        // Mettre à jour dans la base de données
        const affectedRows = await Adherent.updateImageField(id, 'image2', processedImage);

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Adhérent non trouvé ou aucune modification effectuée'
            });
        }

        // Récupérer les données mises à jour
        const updatedAdherent = await Adherent.getByIdWithAllImages(id);

        res.status(200).json({
            success: true,
            message: 'Image 2 mise à jour avec succès',
            data: {
                id: updatedAdherent.id,
                nom: updatedAdherent.nom,
                prenom: updatedAdherent.prenom,
                image2: updatedAdherent.image2
            }
        });

    } catch (error) {
        console.error('Erreur dans updateImage2:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la mise à jour de l\'image 2',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Contrôleur pour mettre à jour image3
export const updateImage3 = async (req, res) => {
    try {
        const { id } = req.params;
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'Les données de l\'image sont requises'
            });
        }


        // Traiter l'image
        const processedImage = processImage(image);

        // Mettre à jour dans la base de données
        const affectedRows = await Adherent.updateImageField(id, 'image3', processedImage);

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Adhérent non trouvé ou aucune modification effectuée'
            });
        }

        // Récupérer les données mises à jour
        const updatedAdherent = await Adherent.getByIdWithAllImages(id);

        res.status(200).json({
            success: true,
            message: 'Image 3 mise à jour avec succès',
            data: {
                id: updatedAdherent.id,
                nom: updatedAdherent.nom,
                prenom: updatedAdherent.prenom,
                image3: updatedAdherent.image3
            }
        });

    } catch (error) {
        console.error('Erreur dans updateImage3:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la mise à jour de l\'image 3',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Contrôleur pour mettre à jour plusieurs images en une seule requête
export const updateMultipleImages = async (req, res) => {
    try {
        const { id } = req.params;
        const { image1, image2, image3 } = req.body;


        // Vérifier qu'au moins une image est fournie
        if (!image1 && !image2 && !image3) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnée image fournie'
            });
        }

        // Préparer les données pour la mise à jour
        const imagesData = {};

        if (image1) {
            imagesData.image1 = processImage(image1);
        }

        if (image2) {
            imagesData.image2 = processImage(image2);
        }

        if (image3) {
            imagesData.image3 = processImage(image3);
        }

        // Mettre à jour dans la base de données
        const affectedRows = await Adherent.updateMultipleImages(id, imagesData);

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Adhérent non trouvé ou aucune modification effectuée'
            });
        }

        // Récupérer les données mises à jour
        const updatedAdherent = await Adherent.getByIdWithAllImages(id);

        res.status(200).json({
            success: true,
            message: 'Images mises à jour avec succès',
            data: {
                id: updatedAdherent.id,
                nom: updatedAdherent.nom,
                prenom: updatedAdherent.prenom,
                image1: updatedAdherent.image1,
                image2: updatedAdherent.image2,
                image3: updatedAdherent.image3
            }
        });

    } catch (error) {
        console.error('Erreur dans updateMultipleImages:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la mise à jour des images',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Contrôleur pour supprimer une image spécifique
export const deleteImage = async (req, res) => {
    try {
        const { id, field } = req.params;

        // Valider que le champ est autorisé
        const allowedFields = ['image1', 'image2', 'image3', 'image'];
        if (!allowedFields.includes(field)) {
            return res.status(400).json({
                success: false,
                message: `Champ non autorisé. Champs valides: ${allowedFields.join(', ')}`
            });
        }

        // Supprimer l'image (mettre à NULL)
        const affectedRows = await Adherent.deleteImageField(id, field);

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Adhérent non trouvé ou aucune modification effectuée'
            });
        }

        // Récupérer les données mises à jour
        const updatedAdherent = await Adherent.getByIdWithAllImages(id);

        res.status(200).json({
            success: true,
            message: `${field} supprimé avec succès`,
            data: {
                id: updatedAdherent.id,
                nom: updatedAdherent.nom,
                prenom: updatedAdherent.prenom,
                [field]: null
            }
        });

    } catch (error) {
        console.error(`Erreur dans deleteImage (${field}):`, error);
        res.status(500).json({
            success: false,
            message: `Erreur serveur lors de la suppression de ${field}`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Contrôleur pour récupérer toutes les images d'un adhérent
export const getAllImages = async (req, res) => {
    try {
        const { id } = req.params;

        // Récupérer l'adhérent avec toutes ses images
        const adherent = await Adherent.getByIdWithAllImages(id);

        if (!adherent) {
            return res.status(404).json({
                success: false,
                message: 'Adhérent non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Images récupérées avec succès',
            data: {
                id: adherent.id,
                nom: adherent.nom,
                prenom: adherent.prenom,
                image: adherent.image,
                image1: adherent.image1,
                image2: adherent.image2,
                image3: adherent.image3
            }
        });

    } catch (error) {
        console.error('Erreur dans getAllImages:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des images',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Contrôleur pour récupérer une image spécifique
export const getImage = async (req, res) => {
    try {
        const { id, field } = req.params;


        // Valider que le champ est autorisé
        const allowedFields = ['image1', 'image2', 'image3', 'image'];
        if (!allowedFields.includes(field)) {
            return res.status(400).json({
                success: false,
                message: `Champ non autorisé. Champs valides: ${allowedFields.join(', ')}`
            });
        }

        // Récupérer l'adhérent
        const adherent = await Adherent.getByIdWithAllImages(id);

        if (!adherent) {
            return res.status(404).json({
                success: false,
                message: 'Adhérent non trouvé'
            });
        }

        // Vérifier si l'image existe
        if (!adherent[field]) {
            return res.status(404).json({
                success: false,
                message: `${field} non trouvé pour cet adhérent`
            });
        }

        // Si c'est une base64, on peut directement retourner l'URL
        if (adherent[field].startsWith('data:image')) {
            return res.status(200).json({
                success: true,
                message: `${field} récupéré avec succès`,
                data: {
                    id: adherent.id,
                    nom: adherent.nom,
                    prenom: adherent.prenom,
                    [field]: adherent[field]
                }
            });
        }

        // Sinon, retourner l'URL de l'image
        res.status(200).json({
            success: true,
            message: `${field} récupéré avec succès`,
            data: {
                id: adherent.id,
                nom: adherent.nom,
                prenom: adherent.prenom,
                [field]: adherent[field]
            }
        });

    } catch (error) {
        console.error(`Erreur dans getImage (${field}):`, error);
        res.status(500).json({
            success: false,
            message: `Erreur serveur lors de la récupération de ${field}`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export {
    createAdherent,
    getAllAdherents,
    getAllAdherentNames,
    getAdherentById,
    updateAdherent,
    updateAdherentImage,
    deleteAdherent,
    getAdherentStats,
    getTotalAdherents,
    getAdherentByGroupeBydate,
    getAdherentByEcoleBycour,
    unarchiveAdherent,
    archiveAdherent
};