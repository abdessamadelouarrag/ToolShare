export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // parse valide les données et applique les transformations (comme trim)
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      // Extraction des messages d'erreur de Zod
      const errors = error.errors.map((err) => err.message);
      
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Erreur de validation des données',
        errors: errors
      });
    }
  };
};