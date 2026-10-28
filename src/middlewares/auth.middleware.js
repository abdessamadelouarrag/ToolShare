import jwt from 'jsonwebtoken';
import Utilisateur from '../models/Utilisateur.js';
import { AppError } from '../utils/AppError.js';

export const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new AppError("Non autorisé. Aucun token fourni.", 401);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // On récupère l'utilisateur en incluant explicitement le tokenVersion
        const currentUser = await Utilisateur.findById(decoded.sub).select('+tokenVersion');
        
        if (!currentUser || !currentUser.actif) {
            throw new AppError("Utilisateur introuvable ou désactivé.", 401);
        }

        // Vérification de la révocation du token (Logique de déconnexion)
        if (currentUser.tokenVersion !== decoded.tokenVersion) {
            throw new AppError("Token expiré ou révoqué. Veuillez vous reconnecter.", 401);
        }

        req.user = currentUser;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            next(new AppError("Token invalide ou expiré.", 401));
        } else {
            next(error);
        }
    }
};

export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError("Accès interdit !", 403));
        }
        next();
    };
};