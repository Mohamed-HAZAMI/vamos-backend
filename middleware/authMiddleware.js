import jwt from 'jsonwebtoken';

// 1. Middleware principal d'authentification
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Authorization header missing or malformed. Format: "Bearer <token>"',
        code: 'MISSING_AUTH_HEADER'
      });
    }
    
    let token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Access token required after Bearer keyword',
        code: 'MISSING_TOKEN'
      });
    }
    
    // Nettoyage du token
    token = token.replace(/\s+/g, '').trim();
    
    // Validation du format JWT
    const tokenParts = token.split('.');
    
    if (tokenParts.length !== 3) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token format. Token must have 3 parts (header.payload.signature)',
        code: 'MALFORMED_TOKEN'
      });
    }
    
    // Vérification de la configuration
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error - JWT secret missing',
        code: 'JWT_SECRET_MISSING'
      });
    }
    
    const verifyOptions = {
      issuer: process.env.JWT_ISSUER || 'crm-backend-api',
      audience: process.env.JWT_AUDIENCE || 'crm-frontend-app',
      algorithms: ['HS256'],
      ignoreExpiration: false,
      clockTolerance: 30
    };
    
    jwt.verify(token, process.env.JWT_SECRET, verifyOptions, (err, decoded) => {
      if (err) {
        let statusCode = 401;
        let errorCode = 'INVALID_TOKEN';
        let errorMessage = 'Invalid token';
        
        if (err.name === 'TokenExpiredError') {
          statusCode = 401;
          errorCode = 'TOKEN_EXPIRED';
          errorMessage = 'Session expired. Please login again.';
        } else if (err.name === 'JsonWebTokenError') {
          if (err.message.includes('issuer')) {
            errorMessage = 'Invalid token issuer';
            errorCode = 'INVALID_ISSUER';
          } else if (err.message.includes('audience')) {
            errorMessage = 'Invalid token audience';
            errorCode = 'INVALID_AUDIENCE';
          } else if (err.message.includes('signature')) {
            errorMessage = 'Invalid token signature';
            errorCode = 'INVALID_SIGNATURE';
          } else if (err.message.includes('malformed')) {
            errorMessage = 'Token is malformed or corrupted';
            errorCode = 'MALFORMED_TOKEN';
          }
        }
        
        return res.status(statusCode).json({ 
          success: false,
          error: errorMessage,
          code: errorCode,
          timestamp: new Date().toISOString()
        });
      }
      
      // Vérification de l'âge du token (optionnel)
      const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
      const maxTokenAge = 24 * 60 * 60;
      
      if (tokenAge > maxTokenAge) {
        return res.status(401).json({ 
          success: false,
          error: 'Token is too old. Please login again.',
          code: 'TOKEN_TOO_OLD',
          maxAgeHours: 24
        });
      }
      
      req.user = decoded;
      req.token = token;
      
      next();
    });
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during authentication',
      code: 'INTERNAL_AUTH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

// 2. Middleware pour ADMIN SEULEMENT
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Not authenticated' 
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      error: 'Access denied. Administrator privileges required.',
      userRole: req.user.role,
      requiredRole: 'admin'
    });
  }
  
  next();
};

// 3. Middleware générique pour rôles spécifiques
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Not authenticated' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: `Insufficient permissions. Required roles: ${roles.join(', ')}`,
        userRole: req.user.role,
        requiredRoles: roles
      });
    }
    
    next();
  };
};