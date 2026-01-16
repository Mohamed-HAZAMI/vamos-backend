import express from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  deleteUserByEmail
} from "../controllers/userController.js";

import { authenticateToken , requireAdmin} from "../middleware/authMiddleware.js";

const router = express.Router();

// Routes publiques
router.post("/register", 
             authenticateToken,  // 1. Vérifie que l'utilisateur est connecté
             requireAdmin,       // 2. Vérifie qu'il est ADMIN (strictement)
             register            // 3. Exécute l'inscription
            );
router.put('/update-user', authenticateToken , updateUser);
router.post("/login", login);
router.delete('/delete-by-email', authenticateToken , requireAdmin, deleteUserByEmail);

// Routes protégées - accès utilisateur connecté
router.get("/profile", authenticateToken , getProfile);
router.put("/profile", authenticateToken , updateProfile);

// Routes protégées - accès admin seulement
router.get("/", authenticateToken , requireAdmin, getAllUsers);
router.get("/:id", authenticateToken , requireAdmin, getUserById);
router.delete("/:id", authenticateToken , requireAdmin, deleteUser);

export default router;