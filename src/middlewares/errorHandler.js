// src/middlewares/errorHandler.middleware.js (Mise à jour)
import { AppError } from '../utils/AppError.js';

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export const notFoundHandler = (req, res, next) => {
  // Utilisation de AppError pour générer une 404
  next(new AppError(`La ressource demandée (${req.originalUrl}) n'existe pas`, 404));
};