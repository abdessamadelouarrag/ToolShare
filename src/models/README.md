# Modeles ToolShare

Les noms des modeles et des champs suivent `diagrams/Class-diagram.puml`.
Les etats du materiel sont `BON` et `ENDOMMAGE`; les mouvements sont `SORTIE`
et `RETOUR`. Tous les modeles possedent `createdAt` et `updatedAt`.

```js
import { Utilisateur, Magasin, Materiel, Reservation, Mouvement, Installation } from './src/models/index.js';
```

Utiliser `document.save()` pour valider les documents et calculer `dateFin`
a partir de `dateDebut` et `dureeHeures`. Les mises a jour directes par requete
ne declenchent pas les hooks de document. La validation des dates passees
s'applique a la creation; l'historique reste modifiable pour enregistrer un retour.

Le controleur d'authentification hache les mots de passe avec bcrypt avant de
renseigner `motDePasseHash`. Ce champ est exclu des requetes par defaut et du JSON.
L'authentification peut le charger explicitement avec `.select('+motDePasseHash')`.
`tokenVersion` est egalement masque et permet d'invalider les jetons apres un
changement de mot de passe ou une deconnexion.

Les services doivent verifier les roles, l'affectation au magasin, la propriete
des reservations, l'existence des references, les magasins actifs et la disponibilite.
Ils doivent aussi controler les transitions de statut, l'annulation avant le debut
et rendre indisponible un materiel retourne endommage.

L'index unique partiel empeche deux emprunts `EN_COURS` pour le meme materiel.
Il ne garantit pas l'absence de chevauchement des reservations `CONFIRMEE`.
La reservation doit serialiser les demandes par materiel (verrou/version partagee),
verifier `dateDebut < finDemandee && dateFin > debutDemande` pour les statuts
`CONFIRMEE` et `EN_COURS`, puis ecrire atomiquement. Une simple lecture suivie
d'une insertion, meme dans une transaction sans ecriture partagee, ne suffit pas.

Le document Installation utilise l'identifiant unique `installation`.
`GET /api/installation/status` retourne `{ "installe": false }` ou `{ "installe": true }`.
`POST /api/installation` accepte `nom`, `prenom`, `email` et `motDePasse`.
Le controleur cree l'Admin et l'etat d'installation dans la meme transaction.
Une nouvelle installation retourne 409 apres initialisation. Le mot de passe est
hache avec bcrypt et n'est pas renvoye. L'ancien endpoint `/api/auth/default` est supprime.
MongoDB doit fonctionner en replica set; Compose configure automatiquement un membre `rs0`
et conserve le volume existant. Depuis l'hote, utiliser `directConnection=true` dans l'URI.
Ne pas supprimer les documents desactives afin de conserver l'historique.
