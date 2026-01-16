import * as userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";



// Register a new user
export const register = async (req, res) => {
  try {
    const { email, password, role = 'client' } = req.body; // Par défaut 'client'
    
    // Validation simple
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    // Vérifier si l'email existe déjà
    const existingUser = await userModel.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await userModel.create({ 
      email, 
      password: hashedPassword, 
      role 
    });
    
    res.status(201).json({ 
      message: "User registered successfully", 
      userId: result.insertId 
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateUserByEmail = async (req, res) => {
  try {
    const { oldEmail, newEmail, password } = req.body;
    
    if (!oldEmail || !newEmail) {
      return res.status(400).json({ message: "Les emails sont requis." });
    }
    
    // Vérifier si l'utilisateur existe avec l'ancien email
    const [existingUser] = await pool.query(
      'SELECT * FROM users WHERE email = ?', 
      [oldEmail]
    );
    
    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    
    const user = existingUser[0];
    
    // Vérifier si le nouvel email existe déjà (sauf si c'est le même utilisateur)
    const [emailCheck] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?', 
      [newEmail, user.id]
    );
    
    if (emailCheck.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }
    
    // Préparer la mise à jour
    let updateQuery = 'UPDATE users SET email = ? WHERE id = ?';
    let queryParams = [newEmail, user.id];
    
    // Si un mot de passe est fourni, le hasher et l'ajouter
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = 'UPDATE users SET email = ?, password = ? WHERE id = ?';
      queryParams = [newEmail, hashedPassword, user.id];
    }
    
    // Exécuter la mise à jour
    await pool.query(updateQuery, queryParams);
    
    return res.status(200).json({ 
      message: 'Utilisateur mis à jour avec succès.' 
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Supprimer un utilisateur par email
export const deleteUserByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validation simple
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "L'email est requis." 
      });
    }
    

    
    // 1. Vérifier si l'utilisateur existe
    const [existingUser] = await pool.query(
      'SELECT id, email, role FROM users WHERE email = ?', 
      [email]
    );
    
    if (existingUser.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé.' 
      });
    }
    
    const user = existingUser[0];
    
    // 2. Empêcher la suppression des administrateurs (optionnel)
    if (user.role === 'admin') {
      // Compter le nombre d'administrateurs
      const [adminCountResult] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
      );
      
      if (adminCountResult[0].count <= 1) {
        return res.status(403).json({ 
          success: false,
          message: 'Impossible de supprimer le dernier administrateur.' 
        });
      }
    }
    
    // 3. Vérifier s'il y a des contraintes de clé étrangère
    // (optionnel, selon votre schéma de base de données)
    
    // 4. Supprimer l'utilisateur
    const [deleteResult] = await pool.query(
      'DELETE FROM users WHERE id = ?', 
      [user.id]
    );
    
    if (deleteResult.affectedRows === 0) {
      return res.status(500).json({ 
        success: false,
        message: 'Échec de la suppression de l\'utilisateur.' 
      });
    }
    

    
    return res.status(200).json({ 
      success: true,
      message: 'Utilisateur supprimé avec succès.',
      data: {
        deletedEmail: email,
        deletedId: user.id,
        deletedRole: user.role
      }
    });
    
  } catch (error) {
    
    // Gestion des erreurs MySQL spécifiques
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ 
        success: false,
        message: 'Impossible de supprimer cet utilisateur car il a des données associées.',
        code: 'FOREIGN_KEY_CONSTRAINT'
      });
    }
    
    if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      return res.status(408).json({ 
        success: false,
        message: 'Timeout lors de la suppression. Veuillez réessayer.',
        code: 'LOCK_TIMEOUT'
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la suppression.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update current user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, password, currentPassword } = req.body;
    
    // Récupérer l'utilisateur actuel
    const currentUser = await userModel.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Préparer les données de mise à jour
    const updateData = {};
    
    // Vérifier si l'email est modifié et s'il n'existe pas déjà
    if (email && email !== currentUser.email) {
      const existingUser = await userModel.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: "Email already in use" });
      }
      updateData.email = email;
    }
    
    // Si changement de mot de passe, vérifier l'ancien mot de passe
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required to change password" });
      }
      
      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Mettre à jour l'utilisateur si des changements sont demandés
    if (Object.keys(updateData).length > 0) {
      const isUpdated = await userModel.update(userId, {
        ...updateData,
        role: currentUser.role // Garder le même rôle
      });
      
      if (!isUpdated) {
        return res.status(400).json({ error: "Update failed" });
      }
    }
    
    res.status(200).json({ 
      message: "Profile updated successfully" 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Fonction pour rechercher un adhérent par email
const findAdherentByEmail = async (email) => {
  try {
    // Requête SQL pour trouver l'adhérent par email
    const [rows] = await pool.execute(
      'SELECT id FROM adherents WHERE email = ? LIMIT 1',
      [email]
    );
    
    if (rows.length > 0) {
      return rows[0].id; // Retourne l'ID de l'adhérent
    }
    return null; // Aucun adhérent trouvé
  } catch (error) {
    console.error("Erreur lors de la recherche de l'adhérent:", error);
    return null;
  }
};

// Login user with JWT
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: "Email and password are required" 
      });
    }
    
    const user = await userModel.findOne({ where: { email } });
    
    if (user && await bcrypt.compare(password, user.password)) {
      // Rechercher l'adhérent correspondant à cet email
      const idAdherent = await findAdherentByEmail(email);
      
      // Créer le token JWT avec l'ID adhérent si trouvé
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          idAdherent: idAdherent
        },
        process.env.JWT_SECRET,
        { 
          expiresIn: process.env.JWT_EXPIRES_IN || '8h',
          issuer: process.env.JWT_ISSUER || 'crm-backend-api',
          audience: process.env.JWT_AUDIENCE || 'crm-frontend-app'
        }
      );
      
      // Ne pas renvoyer le mot de passe dans la réponse
      const { password: _, ...userWithoutPassword } = user;
      
      // Préparer la réponse avec les informations supplémentaires
      const responseData = {
        success: true,
        message: "Login successful",
        token,
        user: userWithoutPassword
      };
      
      // Ajouter l'ID adhérent à la réponse si trouvé
      if (idAdherent) {
        responseData.user.idAdherent = idAdherent;
      }
      
      res.status(200).json(responseData);
    } else {
      res.status(401).json({ 
        success: false,
        error: "Invalid email or password" 
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      error: "An error occurred during authentication" 
    });
  }
};


// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Rechercher l'adhérent correspondant à l'email de l'utilisateur
    const idAdherent = await findAdherentByEmail(user.email);
    
    // Ne pas renvoyer le mot de passe
    const { password, ...userWithoutPassword } = user;
    
    // Ajouter l'ID adhérent à la réponse si trouvé
    const responseData = { ...userWithoutPassword };
    if (idAdherent) {
      responseData.idAdherent = idAdherent;
    }
    
    res.status(200).json(responseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.findAll();
    
    // Pour chaque utilisateur, chercher l'ID adhérent correspondant
    const usersWithAdherent = await Promise.all(
      users.map(async (user) => {
        const { password, ...userWithoutPassword } = user;
        const idAdherent = await findAdherentByEmail(user.email);
        
        return {
          ...userWithoutPassword,
          idAdherent: idAdherent || null
        };
      })
    );
    
    res.status(200).json(usersWithAdherent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get user by ID (admin or self)
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Rechercher l'adhérent correspondant à l'email de l'utilisateur
    const idAdherent = await findAdherentByEmail(user.email);
    
    // Ne pas renvoyer le mot de passe
    const { password, ...userWithoutPassword } = user;
    
    // Ajouter l'ID adhérent à la réponse si trouvé
    const responseData = { ...userWithoutPassword };
    if (idAdherent) {
      responseData.idAdherent = idAdherent;
    }
    
    res.status(200).json(responseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user
// export const updateUser = async (req, res) => {
//   try {
//     const { oldEmail, newEmail, password } = req.body;
    
//     if (!oldEmail || !newEmail) {
//       return res.status(400).json({ message: "Les emails sont requis." });
//     }
    
//     // 1. Vérifier si l'utilisateur existe avec l'ancien email
//     const query = 'SELECT * FROM users WHERE email = ?';
//     connection.query(query, [oldEmail], (error, results) => {
//       if (error) {
//         console.error('Erreur lors de la recherche de l\'utilisateur:', error);
//         return res.status(500).json({ message: 'Erreur serveur.' });
//       }
      
//       if (results.length === 0) {
//         return res.status(404).json({ message: 'Utilisateur non trouvé.' });
//       }
      
//       const user = results[0];
      
//       // 2. Vérifier si le nouvel email existe déjà (sauf si c'est le même utilisateur)
//       const checkEmailQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
//       connection.query(checkEmailQuery, [newEmail, user.id], (error, emailResults) => {
//         if (error) {
//           console.error('Erreur lors de la vérification de l\'email:', error);
//           return res.status(500).json({ message: 'Erreur serveur.' });
//         }
        
//         if (emailResults.length > 0) {
//           return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
//         }
        
//         // 3. Préparer la mise à jour
//         let updateQuery = 'UPDATE users SET email = ? WHERE id = ?';
//         const queryParams = [newEmail, user.id];
        
//         // 4. Si un mot de passe est fourni, le hasher et l'ajouter
//         if (password) {
//           bcrypt.hash(password, 10, (hashError, hashedPassword) => {
//             if (hashError) {
//               console.error('Erreur lors du hash du mot de passe:', hashError);
//               return res.status(500).json({ message: 'Erreur serveur.' });
//             }
            
//             updateQuery = 'UPDATE users SET email = ?, password = ? WHERE id = ?';
//             connection.query(updateQuery, [newEmail, hashedPassword, user.id], (updateError) => {
//               if (updateError) {
//                 console.error('Erreur lors de la mise à jour de l\'utilisateur:', updateError);
//                 return res.status(500).json({ message: 'Erreur serveur.' });
//               }
              
//               return res.status(200).json({ 
//                 message: 'Utilisateur mis à jour avec succès.' 
//               });
//             });
//           });
//         } else {
//           // Pas de mot de passe à mettre à jour
//           connection.query(updateQuery, queryParams, (updateError) => {
//             if (updateError) {
//               console.error('Erreur lors de la mise à jour de l\'utilisateur:', updateError);
//               return res.status(500).json({ message: 'Erreur serveur.' });
//             }
            
//             return res.status(200).json({ 
//               message: 'Utilisateur mis à jour avec succès.' 
//             });
//           });
//         }
//       });
//     });
//   } catch (error) {
//     console.error('Erreur dans updateUser:', error);
//     res.status(500).json({ message: 'Erreur serveur.' });
//   }
// };

// users.controller.js
export const updateUser = async (req, res) => {
  try {
    const { email, newEmail, password } = req.body;
    

    
    if (!email) {
      return res.status(400).json({ 
        message: "L'email de l'utilisateur à modifier est requis." 
      });
    }
    
    // Vérifier si l'utilisateur existe
    const [existingUser] = await pool.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );
    
    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    
    const user = existingUser[0];

    
    // Préparer les données de mise à jour
    const updates = [];
    const params = [];
    
    // Vérifier et ajouter le nouvel email si fourni
    if (newEmail) {
      
      // Vérifier si le nouvel email existe déjà
      const [emailCheck] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?', 
        [newEmail, user.id]
      );
      
      if (emailCheck.length > 0) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
      }
      
      updates.push('email = ?');
      params.push(newEmail);
    }
    
    // Vérifier et ajouter le nouveau mot de passe si fourni
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }
    
    // Si aucune mise à jour n'est demandée
    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune modification demandée.' });
    }
    
    // Construire et exécuter la requête
    params.push(user.id);
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    
    const [result] = await pool.query(updateQuery, params);

    
    return res.status(200).json({ 
      message: 'Utilisateur mis à jour avec succès.',
      updatedFields: {
        email: newEmail ? 'mis à jour' : 'inchangé',
        password: password ? 'mis à jour' : 'inchangé'
      }
    });
    
  } catch (error) {

    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Delete user by ID (admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Empêcher l'utilisateur de se supprimer lui-même
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }
    
    // Vérifier si l'utilisateur existe
    const userExists = await userModel.findById(id);
    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Supprimer l'utilisateur
    const isDeleted = await userModel.remove(id);
    
    if (!isDeleted) {
      return res.status(400).json({ error: "Delete failed" });
    }
    
    res.status(200).json({ 
      message: "User deleted successfully", 
      userId: id 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};