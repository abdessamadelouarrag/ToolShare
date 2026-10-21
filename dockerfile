# Utiliser l'image officielle Node.js (version LTS recommandée)
FROM node:20-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /usr/src/app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code source
COPY . .

# Exposer le port de l'API (ex: 3000)
EXPOSE 3000

# Commande par défaut pour lancer l'application (mode dev avec nodemon ou démarrage standard)
CMD ["npm", "run", "dev"]