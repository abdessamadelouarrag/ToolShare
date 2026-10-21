const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Options de configuration Mongoose recommandées
    });
    console.log(`MongoDB Connecté avec succès : ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur de connexion à MongoDB : ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
